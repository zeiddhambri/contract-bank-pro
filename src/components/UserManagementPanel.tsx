
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Enums } from '@/integrations/supabase/types';
import { Constants } from "@/integrations/supabase/types";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type ProfileWithBank = Tables<'profiles'> & { banks: { name: string } | null };

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, banks(name)')
    .order('created_at', { ascending: false });

  if (error) {
    // The RLS policy might be missing.
    console.error("Error fetching users:", error);
    toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs. Les droits d'accès sont peut-être manquants.",
        variant: "destructive"
    });
    throw error;
  }
  return data as ProfileWithBank[];
};

const UserManagementPanel = () => {
    const queryClient = useQueryClient();
    const { userRole } = useAuth();

    const { data: users, isLoading, error } = useQuery<ProfileWithBank[]>({
        queryKey: ['users'],
        queryFn: fetchUsers,
    });

    const updateUserRoleMutation = useMutation<
        void,
        Error,
        { userId: string; role: Enums<'app_role'> }
    >({
        mutationFn: async ({ userId, role }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast({
                title: "Succès",
                description: "Le rôle de l'utilisateur a été mis à jour.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error?.message || "Impossible de mettre à jour le rôle.",
                variant: "destructive",
            });
        },
    });

    const handleRoleChange = (userId: string, role: Enums<'app_role'>) => {
        updateUserRoleMutation.mutate({ userId, role });
    };

    const assignableRoles = userRole === 'super_admin'
      ? Constants.public.Enums.app_role
      : Constants.public.Enums.app_role.filter(r => r !== 'super_admin');

    if (isLoading) return <div className="text-center p-8">Loading users...</div>;
    if (error) return <div className="text-center p-8 text-destructive">Error loading users. Check console for details.</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead>Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.full_name || 'N/A'}</TableCell>
                                    <TableCell>{user.banks?.name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.role}
                                            onValueChange={(newRole) => handleRoleChange(user.id, newRole as Enums<'app_role'>)}
                                            disabled={updateUserRoleMutation.isPending && updateUserRoleMutation.variables?.userId === user.id}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {assignableRoles.map(role => (
                                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default UserManagementPanel;

