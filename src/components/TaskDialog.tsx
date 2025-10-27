import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
}

export function TaskDialog({ open, onClose, defaultDate }: TaskDialogProps) {
  const createTask = useMutation(api.tasks.create);
  const groups = useQuery(api.groups.list);
  const [isLoading, setIsLoading] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [repeatOption, setRepeatOption] = useState<string>("none");
  const [endType, setEndType] = useState<"forever" | "until" | "count">("forever");
  const [endDate, setEndDate] = useState<string>("");
  const [occurrences, setOccurrences] = useState<number>(10);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueDate = formData.get("dueDate") as string;
    const priority = formData.get("priority") as "low" | "medium" | "high";

    const dueDateObj = new Date(dueDate);
    const dueDateTimestamp = dueDateObj.getTime();

    // Build recurrence rule if repeating
    let recurrenceRule = undefined;
    let recurrenceEnd = undefined;
    
    if (repeatOption !== "none") {
      if (repeatOption === "daily") {
        recurrenceRule = { frequency: "daily" as const };
      } else if (repeatOption === "weekly") {
        recurrenceRule = {
          frequency: "weekly" as const,
          dayOfWeek: dueDateObj.getDay(),
        };
      } else if (repeatOption === "monthly") {
        recurrenceRule = {
          frequency: "monthly" as const,
          dayOfMonth: dueDateObj.getDate(),
        };
      }

      // Build recurrence end
      if (endType === "until" && endDate) {
        recurrenceEnd = {
          type: "until" as const,
          endDate: new Date(endDate).getTime(),
        };
      } else if (endType === "count") {
        recurrenceEnd = {
          type: "count" as const,
          occurrences: occurrences,
        };
      } else {
        recurrenceEnd = {
          type: "forever" as const,
        };
      }
    }

    try {
      await createTask({
        title,
        description: description || undefined,
        dueDate: dueDateTimestamp,
        priority,
        status: "pending",
        isShared: isShared,
        groupId: isShared && selectedGroup ? (selectedGroup as any) : undefined,
        recurrenceRule,
        recurrenceEnd,
      });
      toast.success(
        recurrenceRule
          ? `Recurring task created! It will repeat ${repeatOption}.`
          : "Task created successfully!"
      );
      setIsShared(false);
      setSelectedGroup("");
      setRepeatOption("none");
      setEndType("forever");
      setEndDate("");
      setOccurrences(10);
      onClose();
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultDateTimeStr = () => {
    const date = defaultDate || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T19:00`; // Default to 7:00 PM
  };

  const defaultDateStr = getDefaultDateTimeStr();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 text-white max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg sm:text-xl">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input
              id="title"
              name="title"
              required
              className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white placeholder:text-white/50"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              name="description"
              className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white placeholder:text-white/50"
              placeholder="Enter task description"
            />
          </div>

          <div>
            <Label htmlFor="dueDate" className="text-white">Due Date & Time</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="datetime-local"
              required
              defaultValue={defaultDateStr}
              className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white [color-scheme:dark]"
            />
          </div>

          <div>
            <Label htmlFor="priority" className="text-white">Priority</Label>
            <Select name="priority" defaultValue="medium">
              <SelectTrigger className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="repeat" className="text-white">Repeat</Label>
            <Select value={repeatOption} onValueChange={setRepeatOption}>
              <SelectTrigger className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {repeatOption === "weekly" && (
              <p className="text-xs text-white/60 mt-1">
                Will repeat every week on the same day as the due date
              </p>
            )}
            {repeatOption === "monthly" && (
              <p className="text-xs text-white/60 mt-1">
                Will repeat every month on the same day of the month
              </p>
            )}
          </div>

          {repeatOption !== "none" && (
            <div className="space-y-3 p-3 rounded-lg bg-white/5 dark:bg-black/20 border border-white/10 dark:border-blue-500/20">
              <Label className="text-white font-semibold">Repeat Until</Label>
              <Select value={endType} onValueChange={(v) => setEndType(v as any)}>
                <SelectTrigger className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                  <SelectItem value="forever">Forever</SelectItem>
                  <SelectItem value="until">Until Date</SelectItem>
                  <SelectItem value="count">For X Repetitions</SelectItem>
                </SelectContent>
              </Select>

              {endType === "until" && (
                <div>
                  <Label htmlFor="endDate" className="text-white text-sm">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white [color-scheme:dark]"
                  />
                </div>
              )}

              {endType === "count" && (
                <div>
                  <Label htmlFor="occurrences" className="text-white text-sm">Number of Occurrences</Label>
                  <Input
                    id="occurrences"
                    type="number"
                    min="1"
                    value={occurrences}
                    onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                    className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="sharing" className="text-white">Task Visibility</Label>
            <Select 
              value={isShared ? selectedGroup || "shared" : "private"} 
              onValueChange={(value) => {
                if (value === "private") {
                  setIsShared(false);
                  setSelectedGroup("");
                } else {
                  setIsShared(true);
                  setSelectedGroup(value);
                }
              }}
            >
              <SelectTrigger className="bg-white/10 dark:bg-black/20 border-white/20 dark:border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                <SelectItem value="private">Private (Just me)</SelectItem>
                {groups && groups.length > 0 && (
                  <>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {groups && groups.length === 0 && (
              <p className="text-xs text-white/60 mt-1">
                Create a group in Settings to share tasks
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose} className="text-white hover:bg-white/10 dark:hover:bg-blue-500/20 w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-white/20 dark:bg-blue-500/30 hover:bg-white/30 dark:hover:bg-blue-500/40 text-white w-full sm:w-auto">
              {isLoading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}