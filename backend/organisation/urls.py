from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DivisionViewSet, ServiceViewSet, BureauViewSet

router = DefaultRouter()
router.register(r'divisions', DivisionViewSet)
router.register(r'services', ServiceViewSet)
router.register(r'bureaux', BureauViewSet)

urlpatterns = [
    path('', include(router.urls)),
]