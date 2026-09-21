from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, LoginView

router = DefaultRouter()
router.register(r'', UtilisateurViewSet, basename='utilisateur')
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateurs_alias')
router.register(r'fonctionnaires', UtilisateurViewSet, basename='fonctionnaire')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('', include(router.urls)),
]