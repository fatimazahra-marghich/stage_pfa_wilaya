from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """Accès réservé uniquement au rôle ADMIN."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = str(getattr(request.user, 'role', '')).upper().strip()
        return role in ['ADMIN', 'SUPERADMIN'] or request.user.is_superuser


class IsRHGeneralUserRole(permissions.BasePermission):
    """Accès réservé uniquement au Chef RH Général et Administrateurs."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = str(getattr(request.user, 'role', '')).upper().strip()
        return getattr(request.user, 'est_rh_general', False) or role in ['ADMIN', 'SUPERADMIN'] or request.user.is_superuser


class IsRHUserRole(permissions.BasePermission):
    """Accès réservé aux employés du département RH et ADMIN_RH."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = str(getattr(request.user, 'role', '')).upper().strip()
        code_service = str(getattr(getattr(request.user, 'service', None), 'code', '') or '').upper()
        return role in ['RH', 'ADMIN_RH', 'DIRECTEUR'] or 'RH' in code_service


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permet la lecture à tout utilisateur connecté.
    Réserve les modifications aux Administrateurs uniquement.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        role = str(getattr(request.user, 'role', '')).upper().strip()
        return role in ['ADMIN', 'SUPERADMIN'] or request.user.is_superuser