from rest_framework import viewsets, permissions
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
        # Filtre les soldes uniquement pour l'utilisateur connecté
        return SoldeConge.objects.filter(utilisateur=self.request.user)

class JourFerieViewSet(viewsets.ModelViewSet):
    queryset = JourFerie.objects.all()
    serializer_class = JourFerieSerializer
    permission_classes = [permissions.IsAuthenticated]

class DemandeCongeViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filtre les demandes uniquement pour l'utilisateur connecté
        return DemandeConge.objects.filter(utilisateur=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Associe automatiquement l'utilisateur connecté à la demande
        serializer.save(utilisateur=self.request.user)

class EtapeValidationViewSet(viewsets.ModelViewSet):
    queryset = EtapeValidation.objects.all()
    serializer_class = EtapeValidationSerializer
    permission_classes = [permissions.IsAuthenticated]