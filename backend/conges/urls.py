from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TypeCongeViewSet, SoldeCongeViewSet, JourFerieViewSet, 
    DemandeCongeViewSet, EtapeValidationViewSet
)

router = DefaultRouter()
router.register(r'types-conge', TypeCongeViewSet)
router.register(r'soldes', SoldeCongeViewSet)
router.register(r'jours-feries', JourFerieViewSet)
router.register(r'demandes', DemandeCongeViewSet)
router.register(r'etapes-validation', EtapeValidationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]