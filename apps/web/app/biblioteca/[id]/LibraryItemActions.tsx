'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit2, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '../../../components/feed/ConfirmDeleteModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LibraryItemActionsProps {
  id: string;
  userId: string;
  schoolId?: string | null;
}

export default function LibraryItemActions({ id, userId, schoolId }: LibraryItemActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currentUser = session?.user as any;

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';
  const isOwner = currentUser.id === userId || (schoolId && currentUser.schoolId === schoolId);

  if (!isAdmin && !isOwner) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/library/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentUser.accessToken}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      
      // Redirect to the correct page based on role
      if (isAdmin) {
        router.push('/admin/biblioteca');
      } else {
        router.push('/biblioteca/meus-materiais');
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir o material.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-4 md:mt-0 md:ml-auto md:self-start">
        <Link
          href={`/biblioteca/editar/${id}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
      </div>

      {showDeleteModal && (
        <ConfirmDeleteModal
          title="Excluir Material"
          description="Tem certeza que deseja excluir este material permanentemente? Esta ação não poderá ser desfeita e removerá eventuais rascunhos em análise."
          loading={isDeleting}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
