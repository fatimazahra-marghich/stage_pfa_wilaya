from rest_framework import serializers
from .models import Division, Service, Bureau

class BureauSerializer(serializers.ModelSerializer):
    service_nom = serializers.ReadOnlyField(source='service.nom')

    class Meta:
        model = Bureau
        fields = ['id', 'nom', 'code', 'service', 'service_nom']

class ServiceSerializer(serializers.ModelSerializer):
    division_nom = serializers.ReadOnlyField(source='division.nom')
    bureaux = BureauSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'nom', 'code', 'division', 'division_nom', 'bureaux']

class DivisionSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = Division
        fields = ['id', 'nom', 'code', 'services']