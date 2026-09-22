from rest_framework import serializers
from datetime import date
from .models import TypeConge, SoldeConge, JourFerie, DemandeConge, EtapeValidation, CorrectionSolde
from users.serializers import UtilisateurSerializer


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
    commentaire_refus = serializers.SerializerMethodField()

    class Meta:
        model = DemandeConge
        fields = [
            'id', 'utilisateur', 'utilisateur_details', 'type_conge', 
            'type_conge_libelle', 'date_debut', 'date_fin', 'nombre_jours', 
            'motif', 'piece_jointe', 'statut', 'created_at', 'etapes',
            'commentaire_refus'
        ]
        read_only_fields = ['utilisateur', 'statut', 'created_at', 'nombre_jours']

    def get_commentaire_refus(self, obj):
        etape = EtapeValidation.objects.filter(
            demande=obj
        ).filter(
            decision__in=['REFUSE', 'REFUSEE', 'REFUSEE_CHEF', 'REFUSEE_RH']
        ).order_by('-id').first()

        if not etape:
            etape = EtapeValidation.objects.filter(
                demande=obj
            ).exclude(
                commentaire__isnull=True
            ).exclude(
                commentaire__exact=''
            ).order_by('-id').first()

        return etape.commentaire if etape else getattr(obj, 'commentaire_refus', None)

    def validate(self, data):
        user = self.context['request'].user
        type_conge = data.get('type_conge')
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        piece_jointe = data.get('piece_jointe')
        libelle = getattr(type_conge, 'libelle', '').lower() if type_conge else ''

        # 1. Cohérence des dates
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({"date_fin": "La date de fin doit être égale ou supérieure à la date de début."})

        # 2. Interdiction des dates passées (Sauf maladie)
        if 'maladie' not in libelle and date_debut and date_debut < date.today():
            raise serializers.ValidationError({"date_debut": "Vous ne pouvez pas poser de congé sur une date déjà passée."})

        # 3. Pièce jointe obligatoire
        if type_conge:
            exige_justificatif = (
                getattr(type_conge, 'justificatif_requis', False) or 
                getattr(type_conge, 'necessite_piece_jointe', False) or 
                ('maladie' in libelle)
            )
            if exige_justificatif and not piece_jointe:
                doc_exige = getattr(type_conge, 'type_justificatif', None) or "un document justificatif"
                raise serializers.ValidationError({
                    "piece_jointe": f"Pièce jointe obligatoire : Veuillez fournir {doc_exige}."
                })

        # 4. Anti-chevauchement
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

        # 5. RÈGLES PAR TYPE DE CONGÉ
        from .utils import calculer_jours_ouvrables
        nb_jours = calculer_jours_ouvrables(date_debut, date_fin, type_conge)

        if 'annuel' in libelle or 'administratif' in libelle:
            solde_obj = SoldeConge.objects.filter(utilisateur=user, annee=date_debut.year).first()
            solde_brut = float(solde_obj.solde_actuel) if solde_obj else 0.0

            demandes_attente = DemandeConge.objects.filter(
                utilisateur=user,
                statut__in=['EN_ATTENTE_CHEF', 'EN_ATTENTE_RH'],
                date_debut__year=date_debut.year,
                type_conge=type_conge
            )
            if self.instance:
                demandes_attente = demandes_attente.exclude(pk=self.instance.pk)

            jours_en_attente = sum(float(d.nombre_jours) for d in demandes_attente)
            solde_disponible = solde_brut - jours_en_attente

            if float(nb_jours) > solde_disponible:
                raise serializers.ValidationError({
                    "non_field_errors": f"Solde insuffisant. Vous avez {solde_brut} j au total (dont {jours_en_attente} j en attente). Disponible effectif : {solde_disponible} j."
                })

        elif 'exceptionnel' in libelle:
            demandes_exp = DemandeConge.objects.filter(
                utilisateur=user,
                type_conge=type_conge,
                date_debut__year=date_debut.year,
                statut__in=['VALIDEE', 'VALIDE', 'EN_ATTENTE_CHEF', 'EN_ATTENTE_RH']
            )
            if self.instance:
                demandes_exp = demandes_exp.exclude(pk=self.instance.pk)

            cumul = sum(float(d.nombre_jours) for d in demandes_exp)
            if cumul + float(nb_jours) > 10:
                raise serializers.ValidationError({
                    "non_field_errors": f"Plafond annuel dépassé. Les autorisations exceptionnelles sont limitées à 10 j/an (Déjà consommés/demandés : {cumul} j)."
                })

        elif 'pelerinage' in libelle or 'hajj' in libelle:
            if getattr(user, 'a_fait_pelerinage', False):
                raise serializers.ValidationError({
                    "non_field_errors": "Vous avez déjà bénéficié du congé de pèlerinage au cours de votre carrière."
                })
            if nb_jours > 60:
                raise serializers.ValidationError({
                    "date_fin": "Le congé de pèlerinage ne peut pas dépasser 60 jours (2 mois)."
                })

        elif 'paternite' in libelle or 'naissance' in libelle:
            if nb_jours > 15:
                raise serializers.ValidationError({
                    "date_fin": "Le congé de paternité est limité à 15 jours consécutifs."
                })

        elif 'maternite' in libelle:
            if nb_jours > 98:
                raise serializers.ValidationError({
                    "date_fin": "Le congé de maternité est limité à 14 semaines (98 jours)."
                })

        return data


class CorrectionSoldeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectionSolde
        fields = '__all__'
        read_only_fields = ['cree_par', 'created_at']