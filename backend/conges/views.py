from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, date
import traceback
from rest_framework_simplejwt.authentication import JWTAuthentication

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


# 🏢 RESERVÉ AU RH, ADMIN & CHEFS DE SERVICE
class SoldeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = SoldeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        # 1. Rôles globaux RH / Admin
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or user.is_superuser:
            return SoldeConge.objects.all()

        # 2. Chefs de service
        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return SoldeConge.objects.filter(utilisateur__service=user.service)
            return SoldeConge.objects.filter(utilisateur=user)

        # 3. Agent simple
        return SoldeConge.objects.filter(utilisateur=user)


# ⚙️ GESTION DES JOURS FÉRIÉS
class JourFerieViewSet(viewsets.ModelViewSet):
    queryset = JourFerie.objects.all()
    serializer_class = JourFerieSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]


# 🏢 GESTION DES DEMANDES
class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or user.is_superuser:
            return DemandeConge.objects.all().order_by('-created_at')

        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return DemandeConge.objects.filter(
                    utilisateur__service=user.service
                ).order_by('-created_at')
            return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

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
        libelle_type = getattr(type_conge, 'libelle', '').lower() if type_conge else ''

        # 1. Calcul automatique du nombre de jours
        nb_jours_reels = calculer_jours_ouvrables(date_debut, date_fin, type_conge=type_conge)
        
        # 2. Circuit de validation initial
        if 'maladie' in libelle_type and ('courte' in libelle_type or nb_jours_reels <= 4):
            statut_depart = 'VALIDEE'
        elif 'moyenne' in libelle_type or 'longue' in libelle_type or ('maladie' in libelle_type and nb_jours_reels > 4):
            statut_depart = 'EN_ATTENTE_SANTE'
        elif role in ['CHEF_SERVICE', 'CHEF', 'RH', 'ADMIN_RH']:
            statut_depart = 'EN_ATTENTE_RH'
        else:
            statut_depart = 'EN_ATTENTE_CHEF'

        # 3. Enregistrement de la demande
        demande = serializer.save(
            utilisateur=user,
            nombre_jours=nb_jours_reels,
            statut=statut_depart
        )

        # 4. Déduction automatique si le congé est immédiatement validé (ex: Maladie courte)
        if statut_depart == 'VALIDEE' and ('annuel' in libelle_type or 'administratif' in libelle_type):
            annee_actuelle = date_debut.year
            solde, _ = SoldeConge.objects.get_or_create(
                utilisateur=user,
                annee=annee_actuelle,
                defaults={'droits_acquis': 22.0, 'jours_reportes': 0.0, 'jours_consommes': 0.0}
            )
            solde.jours_consommes += nb_jours_reels
            solde.save()

    @action(detail=True, methods=['post', 'patch', 'put'])
    def valider(self, request, pk=None):
        try:
            demande = self.get_object()
            commentaire = request.data.get('commentaire', '')
            role = str(getattr(request.user, 'role', '')).upper().strip()

            if demande.statut in ['EN_ATTENTE_RH', 'EN_ATTENTE_SANTE'] or role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or request.user.is_superuser:
                demande.statut = 'VALIDEE'

                libelle_type = getattr(demande.type_conge, 'libelle', '').lower()

                if 'annuel' in libelle_type or 'administratif' in libelle_type:
                    annee_actuelle = demande.date_debut.year if demande.date_debut else datetime.now().year
                    solde, _ = SoldeConge.objects.get_or_create(
                        utilisateur=demande.utilisateur,
                        annee=annee_actuelle,
                        defaults={'droits_acquis': 22.0, 'jours_reportes': 0.0, 'jours_consommes': 0.0}
                    )
                    solde.jours_consommes += demande.nombre_jours
                    solde.save()

                elif 'pelerinage' in libelle_type or 'hajj' in libelle_type:
                    agent = demande.utilisateur
                    if hasattr(agent, 'a_fait_pelerinage'):
                        agent.a_fait_pelerinage = True
                        agent.save()

            elif role in ['CHEF_SERVICE', 'CHEF']:
                demande.statut = 'EN_ATTENTE_RH'

            demande.save()

            EtapeValidation.objects.create(
                demande=demande,
                validateur=request.user,
                role_validateur=role or 'RH',
                decision='ACCORDE',
                commentaire=commentaire
            )

            return Response({'status': 'Demande validée avec succès'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR VALIDATION BACKEND ===")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def refuser(self, request, pk=None):
        try:
            demande = self.get_object()
            commentaire = request.data.get('commentaire', '')
            role = str(getattr(request.user, 'role', '')).upper().strip()

            demande.statut = 'REFUSEE_RH' if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or request.user.is_superuser else 'REFUSEE_CHEF'
            demande.save()

            EtapeValidation.objects.create(
                demande=demande,
                validateur=request.user,
                role_validateur=role or 'RH',
                decision='REFUSE',
                commentaire=commentaire
            )

            return Response({'status': 'Demande refusée'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR REFUS BACKEND ===")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post', 'patch'])
    def annuler(self, request, pk=None):
        try:
            demande = self.get_object()
            user = request.user
            role = str(getattr(user, 'role', '')).upper().strip()

            est_proprietaire = (demande.utilisateur == user)

            service_user = getattr(user, 'service_id', None)
            service_demandeur = getattr(demande.utilisateur, 'service_id', None)

            meme_service = (service_user is not None and service_user == service_demandeur) or (
                hasattr(user, 'service') and user.service and hasattr(demande.utilisateur, 'service') and user.service == demande.utilisateur.service
            )

            est_chef_du_demandeur = (role in ['CHEF_SERVICE', 'CHEF'] and meme_service)
            est_admin_or_rh = role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or user.is_superuser

            chef_autorise = est_chef_du_demandeur and demande.statut in ['EN_ATTENTE_CHEF', 'EN_ATTENTE_RH']

            if not est_proprietaire and not chef_autorise and not est_admin_or_rh:
                return Response({'error': 'Action non autorisée sur cette demande.'}, status=status.HTTP_403_FORBIDDEN)

            statuts_en_cours = ['EN_ATTENTE_CHEF', 'EN_ATTENTE_SANTE', 'EN_ATTENTE_RH']
            statut_valide = demande.statut in ['VALIDEE', 'VALIDE']

            if demande.statut not in statuts_en_cours and not statut_valide:
                return Response({'error': 'Cette demande ne peut plus être annulée.'}, status=status.HTTP_400_BAD_REQUEST)

            if statut_valide and demande.date_debut <= date.today():
                return Response({'error': 'Impossible d\'annuler un congé déjà commencé ou passé.'}, status=status.HTTP_400_BAD_REQUEST)

            libelle_type = getattr(demande.type_conge, 'libelle', '').lower()
            if statut_valide and ('annuel' in libelle_type or 'administratif' in libelle_type):
                annee_actuelle = demande.date_debut.year
                solde = SoldeConge.objects.filter(utilisateur=demande.utilisateur, annee=annee_actuelle).first()
                if solde:
                    solde.jours_consommes = max(0.0, float(solde.jours_consommes) - float(demande.nombre_jours))
                    solde.save()

            if statut_valide and ('pelerinage' in libelle_type or 'hajj' in libelle_type):
                agent = demande.utilisateur
                if hasattr(agent, 'a_fait_pelerinage'):
                    agent.a_fait_pelerinage = False
                    agent.save()

            demande.statut = 'ANNULEE'
            demande.save()

            role_actuel = 'CHEF' if (est_chef_du_demandeur and not est_proprietaire) else ('RH' if est_admin_or_rh and not est_proprietaire else 'EMPLOYE')
            EtapeValidation.objects.create(
                demande=demande,
                validateur=user,
                role_validateur=role_actuel,
                decision='ANNULEE',
                commentaire=f"Demande annulée par {user.get_full_name() or user.username}."
            )

            return Response({'status': 'Demande annulée avec succès.'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]