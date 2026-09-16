from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime
import traceback

from .permissions import IsAdminUserRole, IsRHUserRole
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from .serializers import (
    TypeCongeSerializer, SoldeCongeSerializer, 
    JourFerieSerializer, DemandeCongeSerializer, EtapeValidationSerializer
)
from .utils import calculer_jours_ouvrables


# ⚙️ RESERVÉ A L'ADMIN (Gestion des types de congés)
class TypeCongeViewSet(viewsets.ModelViewSet):
    queryset = TypeConge.objects.all()
    serializer_class = TypeCongeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]


# 🏢 RESERVÉ AU RH & ADMIN (Consultation et ajustement des soldes)
class SoldeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = SoldeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        # Le RH et l'Admin voient tous les soldes
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN']:
            return SoldeConge.objects.all()

        # Les employés/chefs ne voient que leur propre solde
        return SoldeConge.objects.filter(utilisateur=user)


# ⚙️ RESERVÉ A L'ADMIN (Configuration des jours fériés)
class JourFerieViewSet(viewsets.ModelViewSet):
    queryset = JourFerie.objects.all()
    serializer_class = JourFerieSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]


# 🏢 GESTION DES DEMANDES (Géré par RH pour la validation finale)
class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        # RH et Admin voient toutes les demandes
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN']:
            return DemandeConge.objects.all().order_by('-created_at')

        # Le Chef de Service voit les demandes de son service
        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return DemandeConge.objects.filter(
                    utilisateur__service=user.service
                ).order_by('-created_at')
            return DemandeConge.objects.all().order_by('-created_at')

        # L'employé classique ne voit que ses propres demandes
        return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()
        
        type_conge = serializer.validated_data.get('type_conge')
        date_debut = serializer.validated_data.get('date_debut')
        date_fin = serializer.validated_data.get('date_fin')
        libelle_type = getattr(type_conge, 'libelle', '').upper() if type_conge else ''

        # 1. Calcul automatique des jours ouvrables
        nb_jours_reels = calculer_jours_ouvrables(date_debut, date_fin)

        # 2. Circuit de validation : Le RH et le CHEF créent directement au statut EN_ATTENTE_RH
        if 'MOYENNE' in libelle_type or 'LONGUE' in libelle_type:
            statut_depart = 'EN_ATTENTE_SANTE'
        elif role in ['CHEF_SERVICE', 'CHEF', 'RH', 'ADMIN_RH']:
            statut_depart = 'EN_ATTENTE_RH'
        else:
            statut_depart = 'EN_ATTENTE_CHEF'

        # 3. Sauvegarde
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

            # Validation définitive si faite par le RH (ou Admin)
            if demande.statut == 'EN_ATTENTE_RH' or role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN']:
                demande.statut = 'VALIDEE'

                # Déduction automatique du solde
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

            demande.statut = 'REFUSEE_RH' if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN'] else 'REFUSEE_CHEF'
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


class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]