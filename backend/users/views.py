from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur
from .serializers import UtilisateurSerializer, ChangePasswordSerializer

User = get_user_model()


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Utilisateur.objects.all().order_by('-id')

        if not user.is_authenticated:
            return queryset.none()

        role = str(getattr(user, 'role', '')).upper().strip()

        # 1. Visibilité Globale : RH Général, ADMIN et SUPERADMIN
        if user.is_superuser or role in ['ADMIN', 'SUPERADMIN'] or getattr(user, 'est_rh_general', False):
            return queryset

        # 2. Chefs de Service (Non-RH) : membres de leur service
        if role == 'CHEF_SERVICE':
            if user.service_id:
                return queryset.filter(service_id=user.service_id)
            
            if hasattr(user, 'services_geres') and user.services_geres.exists():
                services_ids = user.services_geres.values_list('id', flat=True)
                return queryset.filter(service_id__in=services_ids)

        # 3. Agent RH Simple / Employé Standard
        if user.service_id:
            return queryset.filter(service_id=user.service_id)

        return queryset.filter(id=user.id)

    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        GET  /api/users/me/   -> Récupère le profil connecté.
        PATCH /api/users/me/  -> Met à jour le profil connecté (Prénom, Nom).
        """
        user = request.user
        if request.method in ['PATCH', 'PUT']:
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='changer-mot-de-passe', permission_classes=[permissions.IsAuthenticated])
    def changer_mot_de_passe(self, request):
        """
        POST /api/users/changer-mot-de-passe/ -> Permet le changement de mot de passe.
        """
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'detail': 'L\'ancien mot de passe est incorrect.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Mot de passe modifié avec succès.'}, status=status.HTTP_200_OK)


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
            
            service_id = user.service_id
            if not service_id and hasattr(user, 'services_geres') and user.services_geres.exists():
                service_id = user.services_geres.first().id

            user_serialized = UtilisateurSerializer(user).data

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,
                'nom_complet': getattr(user, 'nom_complet', f"{user.first_name} {user.last_name}".strip()),
                'email': user.email,
                'matricule': getattr(user, 'matricule', None),
                'service': service_id,
                'user': user_serialized
            }, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'Adresse email ou mot de passe incorrect.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )