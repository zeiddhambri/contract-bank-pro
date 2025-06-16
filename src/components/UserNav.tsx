
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserNav = () => {
  const { user, userProfile, signOut, isAdmin, loading, userRole } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-slate-700/50 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button 
        asChild
        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
      >
        <Link to="/auth">Se connecter</Link>
      </Button>
    );
  }

  const userInitial = userProfile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?';
  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'Utilisateur';
  const roleLabel = userRole === 'super_admin' ? 'Super Admin' 
                  : userRole === 'bank_admin' ? 'Admin Banque'
                  : userRole === 'user' ? 'Utilisateur'
                  : userRole === 'manager' ? 'Manager'
                  : userRole === 'validator' ? 'Validateur'
                  : userRole === 'auditor' ? 'Auditeur'
                  : 'Utilisateur';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-700/50">
          <Avatar className="h-9 w-9 border border-slate-600">
            <AvatarImage src="" alt="Avatar utilisateur" />
            <AvatarFallback className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 bg-black/90 border-slate-700/50 backdrop-blur-sm" 
        align="end" 
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">{displayName}</p>
            <p className="text-xs leading-none text-slate-400">{user.email}</p>
            <p className="text-xs leading-none text-orange-400 font-medium">{roleLabel}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700/50" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-slate-300 hover:bg-slate-700/50 focus:bg-slate-700/50 cursor-not-allowed opacity-50">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profil (bientôt)</span>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem className="text-slate-300 hover:bg-slate-700/50 focus:bg-slate-700/50 cursor-not-allowed opacity-50">
              <ShieldCheck className="mr-2 h-4 w-4 text-orange-400" />
              <span>Paramètres Admin</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-slate-700/50" />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserNav;
