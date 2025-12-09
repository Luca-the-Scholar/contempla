import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, ChevronUp, Loader2, Edit2, Trash2, Check, X, Calendar, Timer, ChevronRight } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";

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
  const [selectedSession, setSelectedSession] = useState<FeedSession | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      const days = differenceInDays(now, date);
      const weeks = differenceInWeeks(now, date);
      const months = differenceInMonths(now, date);
      const years = differenceInYears(now, date);
      
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days} days ago`;
      if (weeks === 1) return "1 week ago";
      if (weeks < 4) return `${weeks} weeks ago`;
      if (months === 1) return "1 month ago";
      if (months < 12) return `${months} months ago`;
      if (years === 1) return "1 year ago";
      return `${years} years ago`;
    } catch {
      return dateStr;
    }
  };

  const hasExplicitTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // If hours and minutes are both 0, assume no explicit time was set
      return date.getHours() !== 0 || date.getMinutes() !== 0;
    } catch {
      return false;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "EEEE, MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "h:mm a");
    } catch {
      return "";
    }
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

  const openDetails = (session: FeedSession) => {
    setSelectedSession(session);
    setDetailsOpen(true);
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
      <div className="space-y-2">
        {displayedSessions.map((session) => (
          <Card 
            key={session.id} 
            className="p-3 card-interactive cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => !editingId && openDetails(session)}
          >
            <div className="flex items-center gap-3">
              {showUserInfo && session.user_name && (
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                    {getInitials(session.user_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">
                  {session.technique_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRelativeTime(session.session_date)}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {selectedSession?.technique_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  {editingId === selectedSession.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="w-16 h-7 text-sm px-2"
                        min="1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>min</span>
                    </div>
                  ) : (
                    <span className="font-medium">{selectedSession.duration_minutes} minutes</span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatFullDate(selectedSession.session_date)}</span>
                </div>
                
                {hasExplicitTime(selectedSession.session_date) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{formatTime(selectedSession.session_date)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Logged:</span>
                  <span className="font-medium">
                    {selectedSession.manual_entry ? "Manual entry" : "Timer"}
                  </span>
                </div>
              </div>
              
              {/* Edit/Delete Actions */}
              {editable && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {editingId === selectedSession.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(selectedSession.id);
                        }}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(selectedSession);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                            Delete
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
                              onClick={() => {
                                onDelete?.(selectedSession.id);
                                setDetailsOpen(false);
                              }}
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
          )}
        </DialogContent>
      </Dialog>

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
