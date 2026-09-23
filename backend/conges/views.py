import traceback
from datetime import datetime, date
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import models

from .permissions import IsAdminUserRole, IsRHUserRole, IsAdminOrReadOnly
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation, CorrectionSolde
from .serializers import (
    TypeCongeSerializer, SoldeCongeSerializer, 
    JourFerieSerializer, DemandeCongeSerializer, EtapeValidationSerializer,
    CorrectionSoldeSerializer
)
from .utils import calculer_jours_ouvrables


# ⚙️ GESTION DES TYPES DE CONGÉS
class TypeCongeViewSet(viewsets.ModelViewSet):
    queryset = TypeConge.objects.all()
    serializer_class = TypeCongeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]


# 🏢 RESERVÉ AU RH GENERAL, ADMIN & CHEFS DE SERVICE
class SoldeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = SoldeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()
        service_user = getattr(user, 'service', None)
        code_service = str(getattr(service_user, 'code', '') or '').upper().strip()

        # Seul le Chef RH / Admin a la vue sur tous les soldes
        est_chef_rh = (
            getattr(user, 'est_rh_general', False)
            or user.is_superuser
            or role in ['ADMIN', 'SUPERADMIN']
            or (role in ['CHEF_SERVICE', 'CHEF'] and 'RH' in code_service)
        )

        if est_chef_rh:
            return SoldeConge.objects.all()

        if role in ['CHEF_SERVICE', 'CHEF']:
            if service_user:
                return SoldeConge.objects.filter(utilisateur__service=service_user)
            return SoldeConge.objects.filter(utilisateur=user)

        return SoldeConge.objects.filter(utilisateur=user)


# ⚙️ GESTION DES JOURS FÉRIÉS
class JourFerieViewSet(viewsets.ModelViewSet):
    queryset = JourFerie.objects.all()
    serializer_class = JourFerieSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]


# 🏢 GESTION DES DEMANDES DE CONGÉ
class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        if not user.is_authenticated:
            return DemandeConge.objects.none()

        service_user = getattr(user, 'service', None)
        code_service = str(getattr(service_user, 'code', '') or '').upper().strip()

        # Vérification si l'utilisateur est le CHEF RH GÉNÉRAL / ADMIN
        # Un agent simple du service RH (role == 'EMPLOYE') N'EST PAS Chef RH Général
        est_chef_rh = (
            getattr(user, 'est_rh_general', False)
            or user.is_superuser
            or role in ['ADMIN', 'SUPERADMIN']
            or (role in ['CHEF_SERVICE', 'CHEF'] and 'RH' in code_service)
            or (hasattr(user, 'service_dirige') and user.service_dirige and 'RH' in code_service)
        )

        # 1. Chef RH Général & Administrateurs : Visibilité GLOBALE sur toutes les divisions/services
        if est_chef_rh:
            return DemandeConge.objects.all().order_by('-created_at')

        # 2. Chefs de Service Non-RH : Voient les demandes de leur service + les leurs
        if role in ['CHEF_SERVICE', 'CHEF']:
            if service_user:
                return DemandeConge.objects.filter(
                    models.Q(utilisateur__service=service_user) | models.Q(utilisateur=user)
                ).order_by('-created_at')
            return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

        # 3. Agent Standard & Agent RH Simple : ne voient QUE leurs propres demandes
        return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='mes-demandes')
    def mes_demandes(self, request):
        """Retourne UNIQUEMENT les demandes de l'utilisateur connecté."""
        demandes = DemandeConge.objects.filter(utilisateur=request.user).order_by('-created_at')
        serializer = self.get_serializer(demandes, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()
        
        type_conge = serializer.validated_data.get('type_conge')
        date_debut = serializer.validated_data.get('date_debut')
        date_fin = serializer.validated_data.get('date_fin')
        motif_saisi = serializer.validated_data.get('motif', '') or ''
        
        code_type = str(getattr(type_conge, 'code', '') or '').upper().strip()
        libelle_type = str(getattr(type_conge, 'libelle', '') or '').lower().strip()

        # 1. Calcul automatique du nombre de jours réels
        nb_jours_reels = calculer_jours_ouvrables(date_debut, date_fin, type_conge=type_conge)
        
        # 2. Règle spéciale Congé Maladie & Contre-visite
        est_maladie = 'MALADIE' in code_type or ('maladie' in libelle_type and 'exceptionnel' not in libelle_type)

        code_service = str(getattr(getattr(user, 'service', None), 'code', '') or '').upper()
        est_du_service_rh = ('RH' in code_service or 'RESSOURCES' in code_service)

        est_chef_rh = (
            getattr(user, 'est_rh_general', False)
            or user.is_superuser
            or role in ['ADMIN', 'SUPERADMIN']
            or (role in ['CHEF_SERVICE', 'CHEF'] and est_du_service_rh)
        )

        if est_maladie:
            statut_depart = 'VALIDEE'
            if nb_jours_reels > 4:
                tag_contre_visite = "[CONTRE-VISITE MÉDICALE REQUISE]"
                if tag_contre_visite not in motif_saisi:
                    motif_saisi = f"{motif_saisi} {tag_contre_visite}".strip()

        # 3. ROUTAGE DE VALIDATION LOGIQUE MÉTIER
        # A. Chef RH Général : Validée automatiquement d'emblée
        elif est_chef_rh:
            statut_depart = 'VALIDEE'

        # B. Chef de Service Non-RH : Saute la N1 (validé auto) et passe en EN_ATTENTE_RH
        elif role in ['CHEF_SERVICE', 'CHEF']:
            statut_depart = 'EN_ATTENTE_RH'

        # C. Agent du Service RH Simple : Son chef direct est le RH Général -> Directement EN_ATTENTE_RH
        elif est_du_service_rh:
            statut_depart = 'EN_ATTENTE_RH'

        # D. Agent Standard : Passe en EN_ATTENTE_CHEF
        else:
            statut_depart = 'EN_ATTENTE_CHEF'

        # 4. Enregistrement de la demande
        demande = serializer.save(
            utilisateur=user,
            nombre_jours=nb_jours_reels,
            statut=statut_depart,
            motif=motif_saisi
        )

        # 5. Déduction du solde uniquement pour les demandes validées d'office
        est_annuel = 'ANNUEL' in code_type or 'ADMINISTRATIF' in code_type or 'annuel' in libelle_type or 'administratif' in libelle_type
        if statut_depart == 'VALIDEE' and est_annuel:
            annee_actuelle = date_debut.year
            solde, _ = SoldeConge.objects.get_or_create(
                utilisateur=user,
                annee=annee_actuelle,
                defaults={'droits_acquis': 22.0, 'jours_reportes': 0.0, 'jours_consommes': 0.0}
            )
            solde.jours_consommes = float(solde.jours_consommes) + float(nb_jours_reels)
            solde.save()

    @action(detail=True, methods=['post', 'patch', 'put'])
    def valider(self, request, pk=None):
        try:
            demande = self.get_object()
            user = request.user
            commentaire = request.data.get('commentaire', '')
            role = str(getattr(user, 'role', '')).upper().strip()
            code_service = str(getattr(getattr(user, 'service', None), 'code', '') or '').upper()

            est_chef_rh = (
                getattr(user, 'est_rh_general', False)
                or user.is_superuser
                or role in ['ADMIN', 'SUPERADMIN']
                or (role in ['CHEF_SERVICE', 'CHEF'] and 'RH' in code_service)
            )

            # CAS 1 : Validation N1 par le Chef de Service (Non-RH)
            if demande.statut == 'EN_ATTENTE_CHEF' and role in ['CHEF_SERVICE', 'CHEF']:
                demande.statut = 'EN_ATTENTE_RH'
                demande.save()

                EtapeValidation.objects.create(
                    demande=demande,
                    validateur=user,
                    role_validateur='CHEF_SERVICE',
                    decision='ACCORDE',
                    commentaire=commentaire
                )
                return Response({'status': 'Validation N1 effectuée. Transmise au RH.'}, status=status.HTTP_200_OK)

            # CAS 2 : Validation Finale N2 réservée exclusivement au Chef RH Général (ou Admin)
            elif demande.statut in ['EN_ATTENTE_RH', 'EN_ATTENTE_SANTE'] and est_chef_rh:
                demande.statut = 'VALIDEE'

                code_type = str(getattr(demande.type_conge, 'code', '') or '').upper().strip()
                libelle_type = str(getattr(demande.type_conge, 'libelle', '') or '').lower().strip()

                if 'ANNUEL' in code_type or 'ADMINISTRATIF' in code_type or 'annuel' in libelle_type or 'administratif' in libelle_type:
                    annee_actuelle = demande.date_debut.year if demande.date_debut else datetime.now().year
                    solde, _ = SoldeConge.objects.get_or_create(
                        utilisateur=demande.utilisateur,
                        annee=annee_actuelle,
                        defaults={'droits_acquis': 22.0, 'jours_reportes': 0.0, 'jours_consommes': 0.0}
                    )
                    solde.jours_consommes = float(solde.jours_consommes) + float(demande.nombre_jours)
                    solde.save()

                elif 'HAJJ' in code_type or 'PELERINAGE' in code_type or 'pelerinage' in libelle_type or 'hajj' in libelle_type:
                    agent = demande.utilisateur
                    if hasattr(agent, 'a_fait_pelerinage'):
                        agent.a_fait_pelerinage = True
                        agent.save()

                demande.save()

                EtapeValidation.objects.create(
                    demande=demande,
                    validateur=user,
                    role_validateur='RH_GENERAL',
                    decision='ACCORDE',
                    commentaire=commentaire
                )

                return Response({'status': 'Demande validée définitivement par le RH Général'}, status=status.HTTP_200_OK)

            return Response({'error': 'Seul le Chef RH Général peut effectuer la validation finale.'}, status=status.HTTP_403_FORBIDDEN)

        except Exception as e:
            print("=== ERREUR VALIDATION BACKEND ===")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def refuser(self, request, pk=None):
        try:
            demande = self.get_object()
            user = request.user
            commentaire = request.data.get('commentaire', '')
            role = str(getattr(user, 'role', '')).upper().strip()
            code_service = str(getattr(getattr(user, 'service', None), 'code', '') or '').upper()

            est_chef = role in ['CHEF_SERVICE', 'CHEF'] and demande.statut == 'EN_ATTENTE_CHEF'
            est_chef_rh = (
                getattr(user, 'est_rh_general', False)
                or user.is_superuser
                or role in ['ADMIN', 'SUPERADMIN']
                or (role in ['CHEF_SERVICE', 'CHEF'] and 'RH' in code_service)
            ) and demande.statut in ['EN_ATTENTE_RH', 'EN_ATTENTE_SANTE']

            if not est_chef and not est_chef_rh:
                return Response({'error': 'Non autorisé à refuser cette demande.'}, status=status.HTTP_403_FORBIDDEN)

            demande.statut = 'REFUSEE_RH' if est_chef_rh else 'REFUSEE_CHEF'
            demande.save()

            EtapeValidation.objects.create(
                demande=demande,
                validateur=user,
                role_validateur='RH_GENERAL' if est_chef_rh else 'CHEF_SERVICE',
                decision='REFUSE',
                commentaire=commentaire
            )

            return Response({'status': 'Demande refusée'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR REFUS BACKEND ===")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def annuler(self, request, pk=None):
        """Permet l'annulation par l'employé, le chef ou le RH Général."""
        try:
            demande = self.get_object()
            user = request.user
            role = str(getattr(user, 'role', '')).upper().strip()
            code_service = str(getattr(getattr(user, 'service', None), 'code', '') or '').upper()

            est_proprietaire = (demande.utilisateur_id == user.id)

            service_user_id = getattr(user, 'service_id', None) or getattr(getattr(user, 'service', None), 'id', None)
            service_demandeur_id = getattr(demande.utilisateur, 'service_id', None) or getattr(getattr(demande.utilisateur, 'service', None), 'id', None)

            meme_service = (service_user_id is not None and service_user_id == service_demandeur_id)

            est_chef_du_demandeur = (role in ['CHEF_SERVICE', 'CHEF'] and meme_service)
            
            est_chef_rh = (
                getattr(user, 'est_rh_general', False)
                or user.is_superuser
                or role in ['ADMIN', 'SUPERADMIN']
                or (role in ['CHEF_SERVICE', 'CHEF'] and 'RH' in code_service)
            )

            chef_autorise = est_chef_du_demandeur and demande.statut in ['EN_ATTENTE_CHEF', 'EN_ATTENTE_RH', 'VALIDEE', 'VALIDE']

            if not est_proprietaire and not chef_autorise and not est_chef_rh:
                return Response({'error': 'Action non autorisée sur cette demande.'}, status=status.HTTP_403_FORBIDDEN)

            statuts_en_cours = ['EN_ATTENTE_CHEF', 'EN_ATTENTE_SANTE', 'EN_ATTENTE_RH']
            statut_valide = demande.statut in ['VALIDEE', 'VALIDE']

            if demande.statut not in statuts_en_cours and not statut_valide:
                return Response({'error': 'Cette demande ne peut plus être annulée.'}, status=status.HTTP_400_BAD_REQUEST)

            if est_proprietaire and not est_chef_du_demandeur and not est_chef_rh and statut_valide and demande.date_debut <= date.today():
                return Response({'error': 'Impossible d\'annuler un congé déjà commencé ou passé.'}, status=status.HTTP_400_BAD_REQUEST)

            code_type = str(getattr(demande.type_conge, 'code', '') or '').upper().strip()
            libelle_type = str(getattr(demande.type_conge, 'libelle', '') or '').lower().strip()

            if statut_valide and ('ANNUEL' in code_type or 'ADMINISTRATIF' in code_type or 'annuel' in libelle_type or 'administratif' in libelle_type):
                annee_actuelle = demande.date_debut.year
                solde = SoldeConge.objects.filter(utilisateur=demande.utilisateur, annee=annee_actuelle).first()
                if solde:
                    solde.jours_consommes = max(0.0, float(solde.jours_consommes) - float(demande.nombre_jours))
                    solde.save()

            if statut_valide and ('HAJJ' in code_type or 'PELERINAGE' in code_type or 'pelerinage' in libelle_type or 'hajj' in libelle_type):
                agent = demande.utilisateur
                if hasattr(agent, 'a_fait_pelerinage'):
                    agent.a_fait_pelerinage = False
                    agent.save()

            demande.statut = 'ANNULEE'
            demande.save()

            role_actuel = 'CHEF' if (est_chef_du_demandeur and not est_proprietaire) else ('RH' if est_chef_rh and not est_proprietaire else 'EMPLOYE')
            
            commentaire_motif = request.data.get('commentaire', f"Demande annulée par {user.get_full_name() or user.username}.")
            
            EtapeValidation.objects.create(
                demande=demande,
                validateur=user,
                role_validateur=role_actuel,
                decision='ANNULEE',
                commentaire=commentaire_motif
            )

            return Response({'status': 'Demande annulée avec succès.'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR ANNULATION BACKEND ===")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🏢 CORRECTION DE SOLDE
class CorrectionSoldeViewSet(viewsets.ModelViewSet):
    queryset = CorrectionSolde.objects.all()
    serializer_class = CorrectionSoldeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        correction = serializer.save(cree_par=self.request.user)

        solde_id = self.request.data.get('solde_conge')
        nouveau_solde = self.request.data.get('nouveau_solde')

        if solde_id and nouveau_solde is not None:
            try:
                solde = SoldeConge.objects.get(id=solde_id)
                solde.droits_acquis = float(nouveau_solde) + float(solde.jours_consommes) - float(solde.jours_reportes)
                solde.save()
            except SoldeConge.DoesNotExist:
                pass


# 🏢 HISTORIQUE DES ÉTAPES DE VALIDATION
class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]