from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TypeCongeViewSet, SoldeCongeViewSet, JourFerieViewSet, 
    DemandeCongeViewSet, EtapeValidationViewSet
)

router = DefaultRouter()
router.register(r'types-conge', TypeCongeViewSet, basename='typeconge')
router.register(r'soldes', SoldeCongeViewSet, basename='soldeconge')
router.register(r'jours-feries', JourFerieViewSet, basename='jourferie')
router.register(r'demandes', DemandeCongeViewSet, basename='demandeconge')
router.register(r'etapes-validation', EtapeValidationViewSet, basename='etapevalidation')

urlpatterns = [
    path('', include(router.urls)),
]