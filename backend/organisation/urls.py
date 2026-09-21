from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DivisionViewSet, ServiceViewSet

router = DefaultRouter()
router.register(r'divisions', DivisionViewSet)
router.register(r'services', ServiceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]