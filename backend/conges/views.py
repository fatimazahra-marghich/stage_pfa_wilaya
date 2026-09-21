from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime
import traceback
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import CorrectionSolde
from .serializers import CorrectionSoldeSerializer

from .permissions import IsAdminUserRole, IsRHUserRole, IsAdminOrReadOnly
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from .serializers import (
    TypeCongeSerializer, SoldeCongeSerializer, 
    JourFerieSerializer, DemandeCongeSerializer, EtapeValidationSerializer
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

        # 1. Rôles globaux RH / Admin : voient tous les soldes
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or user.is_superuser:
            return SoldeConge.objects.all()

        # 2. Chefs de service : voient les soldes des agents de leur service
        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return SoldeConge.objects.filter(utilisateur__service=user.service)
            return SoldeConge.objects.filter(utilisateur=user)

        # 3. Agent simple : ne voit que son propre solde
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

        # 1. Rôles globaux RH / Admin
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or user.is_superuser:
            return DemandeConge.objects.all().order_by('-created_at')

        # 2. Rôle Chef de Service (Filtrage strict par service)
        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return DemandeConge.objects.filter(
                    utilisateur__service=user.service
                ).order_by('-created_at')
            return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

        # 3. Agent simple
        return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()
        
        type_conge = serializer.validated_data.get('type_conge')
        date_debut = serializer.validated_data.get('date_debut')
        date_fin = serializer.validated_data.get('date_fin')
        libelle_type = getattr(type_conge, 'libelle', '').lower() if type_conge else ''

        # 1. Calcul automatique des jours ouvrables
        nb_jours_reels = calculer_jours_ouvrables(date_debut, date_fin, type_conge=type_conge)
        
        # 2. Circuit de validation
        if 'maladie' in libelle_type and ('courte' in libelle_type or nb_jours_reels <= 4):
            statut_depart = 'VALIDEE'
        elif 'moyenne' in libelle_type or 'longue' in libelle_type or ('maladie' in libelle_type and nb_jours_reels > 4):
            statut_depart = 'EN_ATTENTE_SANTE'
        elif role in ['CHEF_SERVICE', 'CHEF', 'RH', 'ADMIN_RH']:
            statut_depart = 'EN_ATTENTE_RH'
        else:
            statut_depart = 'EN_ATTENTE_CHEF'

        # 3. Enregistrement
        serializer.save(
            utilisateur=user,
            nombre_jours=nb_jours_reels,
            statut=statut_depart
        )

    @action(detail=True, methods=['post', 'patch', 'put'])
    def valider(self, request, pk=None):
        try:
            demande = self.get_object()
            commentaire = request.data.get('commentaire', '')
            role = str(getattr(request.user, 'role', '')).upper().strip()

            if demande.statut == 'EN_ATTENTE_RH' or role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN', 'SUPERADMIN'] or request.user.is_superuser:
                demande.statut = 'VALIDEE'

                # Déduction du solde sur validation finale
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

            if demande.utilisateur != request.user:
                return Response({'error': 'Action non autorisée.'}, status=status.HTTP_403_FORBIDDEN)

            if demande.statut not in ['EN_ATTENTE_CHEF', 'EN_ATTENTE_SANTE', 'EN_ATTENTE_NIVEAU1']:
                return Response({'error': 'Impossible d\'annuler une demande déjà traitée.'}, status=status.HTTP_400_BAD_REQUEST)

            demande.statut = 'ANNULEE'
            demande.save()

            EtapeValidation.objects.create(
                demande=demande,
                validateur=request.user,
                role_validateur='EMPLOYE',
                decision='ANNULEE',
                commentaire='Demande annulée par l\'employé.'
            )

            return Response({'status': 'Demande annulée avec succès.'}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CorrectionSoldeViewSet(viewsets.ModelViewSet):
    queryset = CorrectionSolde.objects.all()
    serializer_class = CorrectionSoldeSerializer
    authentication_classes = [JWTAuthentication] # Exempte du contrôle CSRF cookie
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Sauvegarde la correction avec l'auteur
        correction = serializer.save(cree_par=self.request.user)

        # Met à jour immédiatement le solde de l'agent dans SoldeConge
        solde_id = self.request.data.get('solde_conge')
        nouveau_solde = self.request.data.get('nouveau_solde')
        
        if solde_id and nouveau_solde is not None:
            try:
                solde = SoldeConge.objects.get(id=solde_id)
                # Calcule la différence pour ajuster les droits
                solde.droits_acquis = float(nouveau_solde) + solde.jours_consommes - solde.jours_reportes
                solde.save()
            except SoldeConge.DoesNotExist:
                pass


class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]
