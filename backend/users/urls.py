from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, LoginView

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')
# Alias de sécurité pour capturer les requêtes vers /api/users/fonctionnaires/
router.register(r'fonctionnaires', UtilisateurViewSet, basename='fonctionnaire')

urlpatterns = [
    # Route pour la connexion par Email
    path('auth/login/', LoginView.as_view(), name='login'),
    
    # Routes générées par le Router (/utilisateurs/ et /fonctionnaires/)
    path('', include(router.urls)),
]