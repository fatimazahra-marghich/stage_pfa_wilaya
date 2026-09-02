from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, LoginView

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet)

urlpatterns = [
    # Route personnalisée pour la connexion par Email
    path('auth/login/', LoginView.as_view(), name='login'),
    
    # Routes du Router (/utilisateurs/)
    path('', include(router.urls)),
]