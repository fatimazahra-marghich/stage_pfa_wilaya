from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Utilisateur
from .serializers import UtilisateurSerializer

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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


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