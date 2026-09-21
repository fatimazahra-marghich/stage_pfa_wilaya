from rest_framework import serializers
from datetime import date
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation
from users.serializers import UtilisateurSerializer
from .models import CorrectionSolde  


class TypeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeConge
        fields = '__all__'


class SoldeCongeSerializer(serializers.ModelSerializer):
    solde_actuel = serializers.ReadOnlyField()

    class Meta:
        model = SoldeConge
        fields = ['id', 'utilisateur', 'annee', 'droits_acquis', 'jours_reportes', 'jours_consommes', 'solde_actuel']


class JourFerieSerializer(serializers.ModelSerializer):
    class Meta:
        model = JourFerie
        fields = '__all__'


class EtapeValidationSerializer(serializers.ModelSerializer):
    validateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = EtapeValidation
        fields = '__all__'
        read_only_fields = ['valideur', 'validateur', 'date_action', 'date_decision']

    def get_validateur_nom(self, obj):
        user = getattr(obj, 'valideur', None) or getattr(obj, 'validateur', None)
        return user.get_full_name() if user else ""


class DemandeCongeSerializer(serializers.ModelSerializer):
    utilisateur_details = UtilisateurSerializer(source='utilisateur', read_only=True)
    type_conge_libelle = serializers.ReadOnlyField(source='type_conge.libelle')
    etapes = EtapeValidationSerializer(many=True, read_only=True)

    class Meta:
        model = DemandeConge
        fields = [
            'id', 'utilisateur', 'utilisateur_details', 'type_conge', 
            'type_conge_libelle', 'date_debut', 'date_fin', 'nombre_jours', 
            'motif', 'piece_jointe', 'statut', 'created_at', 'etapes'
        ]
        read_only_fields = ['utilisateur', 'statut', 'created_at', 'nombre_jours']

    def validate(self, data):
        user = self.context['request'].user
        type_conge = data.get('type_conge')
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        piece_jointe = data.get('piece_jointe')
        libelle = getattr(type_conge, 'libelle', '').lower() if type_conge else ''

        # 1. Vérification de l'ordre des dates
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({"date_fin": "La date de fin doit être égale ou supérieure à la date de début."})

        # 2. Interdiction des dates passées (Sauf si maladie)
        if 'maladie' not in libelle and date_debut and date_debut < date.today():
            raise serializers.ValidationError({"date_debut": "Vous ne pouvez pas poser de congé sur une date déjà passée."})

        # 3. Vérification de la pièce jointe obligatoire
        if type_conge:
            exige_justificatif = type_conge.justificatif_requis or ('maladie' in libelle)
            if exige_justificatif and not piece_jointe:
                doc_exige = type_conge.type_justificatif or "un document justificatif"
                raise serializers.ValidationError({
                    "piece_jointe": f"Pièce jointe obligatoire : Veuillez fournir {doc_exige}."
                })

        # 4. Anti-chevauchement (Exclut toutes les variantes de refus et d'annulation)
        statuts_exclus = [
            'REFUSEE_CHEF', 'REFUSEE_RH', 'REFUSEE', 'REFUSE', 
            'ANNULEE', 'ANNULE', 'CANCELED'
        ]
        chevauchement_query = DemandeConge.objects.filter(
            utilisateur=user,
            date_debut__lte=date_fin,
            date_fin__gte=date_debut
        ).exclude(statut__in=statuts_exclus)

        if self.instance:
            chevauchement_query = chevauchement_query.exclude(pk=self.instance.pk)

        if chevauchement_query.exists():
            raise serializers.ValidationError({
                "non_field_errors": "Vous avez déjà une demande enregistrée qui chevauche ces dates."
            })

        # 5. Vérification du solde disponible (Pour congés annuels / administratifs)
        if 'annuel' in libelle or 'administratif' in libelle:
            solde = SoldeConge.objects.filter(utilisateur=user, annee=date_debut.year).first()
            solde_disponible = solde.solde_actuel if solde else 0.0
            
            from .utils import calculer_jours_ouvrables
            nb_jours = calculer_jours_ouvrables(date_debut, date_fin, type_conge)

            if nb_jours > solde_disponible:
                raise serializers.ValidationError({
                    "non_field_errors": f"Solde insuffisant. Vous demandez {nb_jours} jour(s) pour un solde restant de {solde_disponible} jour(s)."
                })

        return data
    
class CorrectionSoldeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectionSolde
        fields = '__all__'
        read_only_fields = ['cree_par', 'created_at']