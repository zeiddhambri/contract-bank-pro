
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const fetchAuditLogs = async () => {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data;
};

const AuditLogPanel = () => {
    const { data: logs, isLoading, error } = useQuery<Tables<'audit_logs'>[]>({
        queryKey: ['audit_logs'],
        queryFn: fetchAuditLogs,
    });

    if (isLoading) return <div className="text-center p-8">Loading audit trail...</div>;
    if (error) return <div className="text-center p-8 text-destructive">Error loading audit trail: {error.message}</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No audit logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs?.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">{log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss') : ''}</TableCell>
                                    <TableCell>{log.user_email}</TableCell>
                                    <TableCell><span className="font-mono text-sm bg-muted px-2 py-1 rounded">{log.action}</span></TableCell>
                                    <TableCell>
                                        {log.details && (
                                            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-w-md">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        )}
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

export default AuditLogPanel;
