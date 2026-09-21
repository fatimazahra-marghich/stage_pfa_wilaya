from datetime import date
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur
from .serializers import UtilisateurSerializer
from conges.models import SoldeConge

User = get_user_model()


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtrage automatique :
        - Les Chefs de Service ne voient QUE les agents de leur service.
        - Si le Chef de Service est assigné en tant que chef dans l'application Organisation,
          ou directement via son champ service.
        - Les RH et ADMIN voient tout le monde.
        """
        user = self.request.user
        queryset = Utilisateur.objects.all()

        if not user.is_authenticated:
            return queryset.none()

        role = str(getattr(user, 'role', '')).upper().strip()

        if role == 'CHEF_SERVICE':
            # 1. Tenter le filtrage par le service directement rattaché à l'utilisateur
            if user.service_id:
                return queryset.filter(service_id=user.service_id)
            
            # 2. Secours : Chercher le service dont cet utilisateur est désigné "chef" dans le modèle Service
            if hasattr(user, 'services_geres') and user.services_geres.exists():
                services_ids = user.services_geres.values_list('id', flat=True)
                return queryset.filter(service_id__in=services_ids)

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Endpoint : GET /api/users/me/
        Renvoie le profil complet du chef connecté (avec l'objet service et son service_id).
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def perform_create(self, serializer):
        utilisateur = serializer.save()
        
        solde_initial = self.request.data.get('solde_conge') or self.request.data.get('solde_actuel') or 22
        
        try:
            valeur_solde = float(solde_initial)
        except (ValueError, TypeError):
            valeur_solde = 22.0

        annee_actuelle = date.today().year

        SoldeConge.objects.update_or_create(
            utilisateur=utilisateur,
            annee=annee_actuelle,
            defaults={'droits_acquis': valeur_solde}
        )

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        utilisateur = self.get_object()

        nouveau_solde = request.data.get('solde_conge') or request.data.get('solde_actuel')
        
        if nouveau_solde is not None:
            annee_actuelle = date.today().year
            solde_obj, _ = SoldeConge.objects.get_or_create(
                utilisateur=utilisateur,
                annee=annee_actuelle,
                defaults={'droits_acquis': 22.0}
            )
            try:
                solde_obj.droits_acquis = float(nouveau_solde)
                solde_obj.save()
            except (ValueError, TypeError):
                pass

        return response


class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not email:
            return Response(
                {'detail': 'Veuillez fournir une adresse email.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user_obj = User.objects.filter(email__iexact=email).first()

        if not user_obj:
            return Response(
                {'detail': 'Adresse email ou mot de passe incorrect.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = authenticate(username=user_obj.username, password=password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {'detail': 'Ce compte est désactivé.'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )

            refresh = RefreshToken.for_user(user)
            
            # Récupération de l'ID du service
            service_id = user.service_id
            if not service_id and hasattr(user, 'services_geres') and user.services_geres.exists():
                service_id = user.services_geres.first().id

            # Sérialisation complète de l'utilisateur
            user_serialized = UtilisateurSerializer(user).data

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,
                'nom_complet': user.nom_complet,
                'email': user.email,
                'matricule': getattr(user, 'matricule', None),
                'service': service_id,
                'user': user_serialized
            }, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'Adresse email ou mot de passe incorrect.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )