from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur
from .serializers import UtilisateurSerializer

User = get_user_model()

# Ton ViewSet existant (CRUD des utilisateurs)
class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer


# La nouvelle vue pour la connexion par Email
class LoginView(APIView):
    permission_classes = []  # Accès public sans authentification préalable

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        # 1. Recherche de l'utilisateur par son email
        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            return Response(
                {'detail': 'Adresse email ou mot de passe incorrect.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 2. Authentification avec le mot de passe
        user = authenticate(username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,  # 'EMPLOYE', 'CHEF_SERVICE', 'ADMIN_RH'
                'nom_complet': user.nom_complet,
                'email': user.email,
                'matricule': user.matricule
            }, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'Adresse email ou mot de passe incorrect.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )