from django.contrib import admin
from .models import Division, Service


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ('id', 'nom', 'code')
    search_fields = ('nom', 'code')


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'nom', 'code', 'division')
    list_filter = ('division',)
    search_fields = ('nom', 'code')