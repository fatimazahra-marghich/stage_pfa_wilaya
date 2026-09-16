from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
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

    def partial_update(self, request, *args, **kwargs):
        """
        Permet au RH d'ajuster le solde directement lors d'un PATCH sur /api/users/id/
        ou /api/fonctionnaires/id/
        """
        response = super().partial_update(request, *args, **kwargs)
        utilisateur = self.get_object()

        # Si la requête contient 'solde_actuel', on met à jour l'enregistrement dans SoldeConge
        nouveau_solde = request.data.get('solde_actuel')
        if nouveau_solde is not None:
            solde_obj, _ = SoldeConge.objects.get_or_create(utilisateur=utilisateur)
            try:
                solde_obj.solde_actuel = float(nouveau_solde)
                solde_obj.save()
            except (ValueError, TypeError):
                pass

        return response


class LoginView(APIView):
    permission_classes = []  # Accès public sans authentification préalable

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        if not email:
            return Response(
                {'detail': 'Veuillez fournir une adresse email.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Recherche sécurisée de l'utilisateur par son email (évite le crash 500)
        user_obj = User.objects.filter(email__iexact=email).first()

        if not user_obj:
            return Response(
                {'detail': 'Adresse email ou mot de passe incorrect.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 2. Authentification avec le mot de passe via le username récupéré
        user = authenticate(username=user_obj.username, password=password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {'detail': 'Ce compte est désactivé.'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )

            refresh = RefreshToken.for_user(user)
            
            # Récupération sécurisée du nom complet si la propriété/champ existe
            nom_complet = getattr(user, 'nom_complet', f"{user.first_name} {user.last_name}".strip())

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,  # 'EMPLOYE', 'CHEF', 'RH', 'ADMIN'
                'nom_complet': nom_complet,
                'email': user.email,
                'matricule': user.matricule
            }, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'Adresse email ou mot de passe incorrect.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )