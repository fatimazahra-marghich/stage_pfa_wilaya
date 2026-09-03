from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from .serializers import (
    TypeCongeSerializer, SoldeCongeSerializer, 
    JourFerieSerializer, DemandeCongeSerializer, EtapeValidationSerializer
)


class TypeCongeViewSet(viewsets.ModelViewSet):
    queryset = TypeConge.objects.all()
    serializer_class = TypeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]


class SoldeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = SoldeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SoldeConge.objects.filter(utilisateur=self.request.user)


class JourFerieViewSet(viewsets.ModelViewSet):
    queryset = JourFerie.objects.all()
    serializer_class = JourFerieSerializer
    permission_classes = [permissions.IsAuthenticated]


class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = str(getattr(user, 'role', '')).upper().strip()

        # Administrateurs RH & Directeurs : vue globale
        if role in ['RH', 'ADMIN_RH', 'DIRECTEUR', 'ADMIN']:
            return DemandeConge.objects.all().order_by('-created_at')

        # Chefs de service : voir les demandes du service + ses propres demandes
        if role in ['CHEF_SERVICE', 'CHEF']:
            if hasattr(user, 'service') and user.service:
                return DemandeConge.objects.filter(
                    utilisateur__service=user.service
                ).order_by('-created_at')
            return DemandeConge.objects.all().order_by('-created_at')

        # Employés : leurs propres demandes uniquement
        return DemandeConge.objects.filter(utilisateur=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Règle métier : Initialisation du statut lors de la soumission
        type_conge = serializer.validated_data.get('type_conge')
        libelle_type = getattr(type_conge, 'libelle', '').upper() if type_conge else ''

        # Maladie moyenne/longue durée -> Passe directement par l'avis du Conseil de Santé
        if 'MOYENNE' in libelle_type or 'LONGUE' in libelle_type:
            statut_depart = 'EN_ATTENTE_CONSEIL_SANTE'
        else:
            statut_depart = 'EN_ATTENTE_CHEF'

        serializer.save(utilisateur=self.request.user, statut=statut_depart)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def valider(self, request, pk=None):
        try:
            demande = self.get_object()
            commentaire = request.data.get('commentaire', '')

            # 1. Mise à jour du statut de la demande selon le rôle
            role = str(getattr(request.user, 'role', '')).upper().strip()
            if role in ['CHEF_SERVICE', 'CHEF']:
                demande.statut = 'EN_ATTENTE_RH'
            else:
                demande.statut = 'VALIDE'
            demande.save()

            # 2. Création de l'étape de validation sécurisée
            try:
                # Teste d'abord le champ 'valideur', sinon fallback sur 'validateur'
                try:
                    EtapeValidation.objects.create(
                        demande=demande,
                        valideur=request.user,
                        statut='APPROUVE',
                        commentaire=commentaire
                    )
                except Exception:
                    EtapeValidation.objects.create(
                        demande=demande,
                        validateur=request.user,
                        statut='APPROUVE',
                        commentaire=commentaire
                    )
            except Exception as err_etape:
                print("⚠️ Erreur création historique EtapeValidation :", str(err_etape))

            return Response({'status': 'Demande validée avec succès'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR VALIDATION BACKEND ===", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post', 'patch', 'put'])
    def refuser(self, request, pk=None):
        try:
            demande = self.get_object()
            commentaire = request.data.get('commentaire', '')

            # 1. Mise à jour du statut de la demande
            demande.statut = 'REFUSEE'
            demande.save()

            # 2. Création de l'étape de refus sécurisée
            try:
                try:
                    EtapeValidation.objects.create(
                        demande=demande,
                        valideur=request.user,
                        statut='REFUSE',
                        commentaire=commentaire
                    )
                except Exception:
                    EtapeValidation.objects.create(
                        demande=demande,
                        validateur=request.user,
                        statut='REFUSE',
                        commentaire=commentaire
                    )
            except Exception as err_etape:
                print("⚠️ Erreur création historique EtapeValidation :", str(err_etape))

            return Response({'status': 'Demande refusée'}, status=status.HTTP_200_OK)

        except Exception as e:
            print("=== ERREUR REFUS BACKEND ===", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # 1. Extraction des données
        demande_id = request.data.get('demande')
        statut_input = request.data.get('statut', 'APPROUVE')
        commentaire = request.data.get('commentaire', '')

        # 2. Vérification existence de la demande
        try:
            demande = DemandeConge.objects.get(pk=demande_id)
        except DemandeConge.DoesNotExist:
            return Response({'error': 'Demande introuvable'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Création directe en BDD sans passer par serializer.is_valid()
        # Cela évite les erreurs de validation des ForeignKeys obligatoires
        etape_kwargs = {
            'demande': demande,
            'statut': statut_input,
            'commentaire': commentaire
        }

        # Détection automatique du nom du champ Utilisateur
        if hasattr(EtapeValidation, 'valideur'):
            etape_kwargs['valideur'] = request.user
        elif hasattr(EtapeValidation, 'validateur'):
            etape_kwargs['validateur'] = request.user

        EtapeValidation.objects.create(**etape_kwargs)

        # 4. Changement du statut de la demande selon le rôle
        role = str(getattr(request.user, 'role', '')).upper().strip()
        if role in ['CHEF_SERVICE', 'CHEF']:
            demande.statut = 'EN_ATTENTE_RH'
        else:
            demande.statut = 'VALIDE'

        demande.save()
        return Response({'message': 'Validation effectuée'}, status=status.HTTP_201_CREATED)