from rest_framework import serializers
from .models import Division, Service


class ServiceSerializer(serializers.ModelSerializer):
    division_nom = serializers.ReadOnlyField(source='division.nom')
    chef_nom = serializers.SerializerMethodField()
    nombre_agents = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ['id', 'nom', 'code', 'division', 'division_nom', 'chef', 'chef_nom', 'nombre_agents']

    def get_chef_nom(self, obj):
        if obj.chef:
            nom_complet = f"{getattr(obj.chef, 'first_name', '')} {getattr(obj.chef, 'last_name', '')}".strip()
            return nom_complet if nom_complet else obj.chef.username
        return "Non assigné"

    def get_nombre_agents(self, obj):
        # Compte le nombre d'utilisateurs liés à ce service
        if hasattr(obj, 'agents'):
            return obj.agents.count()
        return 0


class DivisionSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    responsable_nom = serializers.SerializerMethodField()

    class Meta:
        model = Division
        fields = ['id', 'nom', 'code', 'responsable', 'responsable_nom', 'services']

    def get_responsable_nom(self, obj):
        if obj.responsable:
            nom_complet = f"{getattr(obj.responsable, 'first_name', '')} {getattr(obj.responsable, 'last_name', '')}".strip()
            return nom_complet if nom_complet else obj.responsable.username
        return "Non assigné"