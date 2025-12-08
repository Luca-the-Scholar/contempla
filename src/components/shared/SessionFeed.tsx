import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, ChevronUp, Loader2, Edit2, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from "date-fns";

export interface FeedSession {
  id: string;
  user_id?: string;
  user_name?: string;
  technique_name: string;
  duration_minutes: number;
  session_date: string;
  manual_entry?: boolean;
}

interface SessionFeedProps {
  sessions: FeedSession[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  showUserInfo?: boolean;
  editable?: boolean;
  onEdit?: (sessionId: string, newMinutes: number) => Promise<void>;
  onDelete?: (sessionId: string) => Promise<void>;
  emptyMessage?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const BATCH_SIZE = 20;

export function SessionFeed({
  sessions,
  loading = false,
  hasMore = false,
  onLoadMore,
  showUserInfo = false,
  editable = false,
  onEdit,
  onDelete,
  emptyMessage = "No sessions yet",
  scrollContainerRef,
}: SessionFeedProps) {
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          if (displayedCount < sessions.length) {
            setDisplayedCount((prev) => Math.min(prev + BATCH_SIZE, sessions.length));
          } else if (hasMore && onLoadMore) {
            onLoadMore();
          }
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, displayedCount, sessions.length, hasMore, onLoadMore]);

  // Show back to top button when scrolled
  useEffect(() => {
    const container = scrollContainerRef?.current || window;
    
    const handleScroll = () => {
      const scrollTop = scrollContainerRef?.current 
        ? scrollContainerRef.current.scrollTop 
        : window.scrollY;
      setShowBackToTop(scrollTop > 400);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const scrollToTop = useCallback(() => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [scrollContainerRef]);

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatSessionDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const parseSessionDate = (dateStr: string): Date => {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const startEdit = (session: FeedSession) => {
    setEditingId(session.id);
    setEditMinutes(session.duration_minutes.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMinutes('');
  };

  const saveEdit = async (sessionId: string) => {
    const newMinutes = parseInt(editMinutes, 10);
    if (isNaN(newMinutes) || newMinutes <= 0 || !onEdit) return;
    
    setSaving(true);
    try {
      await onEdit(sessionId, newMinutes);
      setEditingId(null);
      setEditMinutes('');
    } finally {
      setSaving(false);
    }
  };

  const displayedSessions = sessions.slice(0, displayedCount);

  if (sessions.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div ref={feedRef} className="relative">
      <div className="space-y-3">
        {displayedSessions.map((session) => (
          <Card key={session.id} className="p-4 card-interactive">
            <div className="flex items-start gap-3">
              {showUserInfo && session.user_name && (
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                    {getInitials(session.user_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex-1 min-w-0">
                {showUserInfo && session.user_name && (
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{session.user_name}</span>
                    <span className="text-muted-foreground text-sm">practiced</span>
                  </div>
                )}
                
                <p className="text-primary font-medium">
                  {session.technique_name}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {editingId === session.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(e.target.value)}
                          className="w-16 h-6 text-sm px-2"
                          min="1"
                        />
                        <span>min</span>
                      </div>
                    ) : (
                      <span>{session.duration_minutes} min</span>
                    )}
                  </div>
                  <span>•</span>
                  <span>{formatSessionDate(session.session_date)}</span>
                  {session.manual_entry && (
                    <>
                      <span>•</span>
                      <span className="text-xs">Manual</span>
                    </>
                  )}
                </div>
              </div>

              {/* Edit/Delete Actions */}
              {editable && (
                <div className="flex items-center gap-1">
                  {editingId === session.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => saveEdit(session.id)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(session)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this session from your history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete?.(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loading && (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-24 right-4 z-50 shadow-lg gap-1 animate-fade-in"
          onClick={scrollToTop}
        >
          <ChevronUp className="w-4 h-4" />
          Top
        </Button>
      )}
    </div>
  );
}