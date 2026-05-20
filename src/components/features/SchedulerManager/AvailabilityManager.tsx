"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, Clock, Settings, UserCheck, X, 
  Check, AlertCircle, Send, Info, MoreHorizontal, Plus, Star, 
  ArrowDownRight, Mail, RotateCcw, AlertTriangle, GripVertical,
  Sliders, HelpCircle, Save, Loader2
} from "lucide-react";
import clsx from "clsx";

type Tab = "calendar" | "pending" | "rules";

type ViewScale = "day" | "week" | "month";

interface CalendarEvent {
  id: string;
  candidateName: string;
  day: string; // "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"
  hour: string; // e.g. "10:00 AM", "11:00 AM"
  color: "blue" | "yellow" | "green" | "pink" | "purple";
  isVIP?: boolean;
}

interface PendingRequest {
  id: string;
  candidateName: string;
  preferredDay: string;
  preferredHour: string;
}

export default function AvailabilityManager() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [viewScale, setViewScale] = useState<ViewScale>("week");
  const [selectedDay, setSelectedDay] = useState<string>("Wed"); // Active day in Day View
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-schedule rules states
  const [bufferTime, setBufferTime] = useState<string>("30 mins");
  const [maxInterviews, setMaxInterviews] = useState<number>(3);
  const [minNotice, setMinNotice] = useState<string>("24 hours");
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [vipOverride, setVipOverride] = useState<boolean>(true);
  const [savingRules, setSavingRules] = useState<boolean>(false);

  // Rejection/Notification overlay status state
  const [overlayNotification, setOverlayNotification] = useState<string | null>(null);

  // Active Drag state for ghost outline trail
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragHoverCell, setDragHoverCell] = useState<{ day: string; hour: string } | null>(null);

  // Calendar Events State
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: "e1", candidateName: "Interview: Alice Smith", day: "Mon", hour: "10:00 AM", color: "blue" },
    { id: "e2", candidateName: "Interview: Bob Johnson", day: "Tue", hour: "10:00 AM", color: "yellow" },
    { id: "e3", candidateName: "Interview: Clara Oswald", day: "Wed", hour: "10:00 AM", color: "green" },
    { id: "e4", candidateName: "Interview: David Tennant", day: "Thu", hour: "11:00 AM", color: "pink" }
  ]);

  // Pending Requests State
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([
    { id: "p1", candidateName: "Akira Tanaka", preferredDay: "Wed", preferredHour: "10:00 AM" },
    { id: "p2", candidateName: "Akira Nanaka", preferredDay: "Thu", preferredHour: "10:00 AM" }
  ]);

  // Modals state
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [vipName, setVipName] = useState("");
  const [vipDay, setVipDay] = useState("Mon");
  const [vipHour, setVipHour] = useState("9:00 AM");

  // Weekly Recurring Availability Editable State
  const [availabilityTags, setAvailabilityTags] = useState<string[]>([
    "9:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "3:00 PM - 5:00 PM"
  ]);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [tempTagText, setTempTagText] = useState<string>("");
  const [newTagText, setNewTagText] = useState<string>("");
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);

  const handleStartEditTag = (idx: number, currentText: string) => {
    setEditingTagIndex(idx);
    setTempTagText(currentText);
  };

  const handleSaveEditTag = (idx: number) => {
    if (!tempTagText.trim()) return;
    setAvailabilityTags(prev => prev.map((t, i) => i === idx ? tempTagText.trim() : t));
    setEditingTagIndex(null);
    triggerToast("Availability slot updated!");
  };

  const handleKeyDownEditTag = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      handleSaveEditTag(idx);
    } else if (e.key === "Escape") {
      setEditingTagIndex(null);
    }
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    setAvailabilityTags(prev => [...prev, newTagText.trim()]);
    setNewTagText("");
    setIsAddingTag(false);
    triggerToast("Added recurring availability slot!");
  };

  const handleDeleteTag = (idx: number) => {
    setAvailabilityTags(prev => prev.filter((_, i) => i !== idx));
    triggerToast("Availability slot removed.");
  };

  const hours = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM"
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggingEventId(eventId);
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: string, hour: string) => {
    e.preventDefault();
    if (dragHoverCell?.day !== day || dragHoverCell?.hour !== hour) {
      setDragHoverCell({ day, hour });
    }
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetHour: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain") || draggingEventId;
    if (!eventId) return;

    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        triggerToast(`Rescheduled ${ev.candidateName} to ${targetDay} at ${targetHour}`);
        return { ...ev, day: targetDay, hour: targetHour };
      }
      return ev;
    }));

    setDraggingEventId(null);
    setDragHoverCell(null);
  };

  const handleDragEnd = () => {
    setDraggingEventId(null);
    setDragHoverCell(null);
  };

  // Pipeline Actions
  const handleApprove = (req: PendingRequest) => {
    // Inject event
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substring(7),
      candidateName: `Interview: ${req.candidateName}`,
      day: req.preferredDay,
      hour: req.preferredHour,
      color: "green"
    };

    setEvents(prev => [...prev, newEvent]);
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    triggerToast(`Approved & drop-scheduled Akira Tanaka's slot!`);
  };

  const handleReject = (req: PendingRequest) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    setOverlayNotification(
      `Interview canceled. System auto-reverted ${req.candidateName} to notification area and dispatched postponement email.`
    );
  };

  const handleCancelActiveEvent = (ev: CalendarEvent) => {
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    setOverlayNotification(
      `Interview canceled. System auto-reverted ${ev.candidateName.replace("Interview: ", "")} to notification area and dispatched postponement email.`
    );
  };

  const handleAddVIP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipName.trim()) return;

    const newVIP: CalendarEvent = {
      id: Math.random().toString(36).substring(7),
      candidateName: `VIP: ${vipName}`,
      day: vipDay,
      hour: vipHour,
      color: "purple",
      isVIP: true
    };

    setEvents(prev => [...prev, newVIP]);
    setShowVIPModal(false);
    setVipName("");
    triggerToast(`VIP Override Scheduled for ${vipName}!`);
  };

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    setTimeout(() => {
      setSavingRules(false);
      triggerToast("Auto-schedule rules saved successfully!");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1d1b] p-6 relative font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#1c1d1b] text-[#faf9f6] px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 font-medium border border-white/10 text-xs tracking-wide"
          >
            <Check size={16} className="text-[#a8c3a0]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Main Canvas Page Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-serif text-[#1c1d1b]">
            Smart Scheduler - Detailed Calendar & Logic View
          </h1>
          <p className="text-xs text-[#1c1d1b]/50 mt-1 uppercase tracking-wider font-semibold">
            AuraHR Global Availability Dashboard
          </p>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-[#1c1d1b]/10 pb-1 flex items-center justify-between">
          <div className="flex space-x-8">
            {([
              { id: "calendar", label: "Your Calendar & Time Off", icon: CalendarIcon },
              { id: "pending", label: "Pending Requests", icon: Clock, badge: pendingRequests.length },
              { id: "rules", label: "Auto-Schedule Rules", icon: Settings },
            ] as { id: Tab; label: string; icon: any; badge?: number }[]).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={clsx(
                    "pb-3 text-sm font-bold transition-all relative flex items-center gap-2 outline-none",
                    isActive ? "text-[#1c1d1b]" : "text-[#1c1d1b]/40 hover:text-[#1c1d1b]"
                  )}
                >
                  <tab.icon size={16} className={clsx(isActive ? "text-[#a8c3a0]" : "text-[#1c1d1b]/40")} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-[#b05a5a] text-white text-[10px] px-2 py-0.5 rounded-full font-bold leading-none shrink-0">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a8c3a0]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Panels */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === "calendar" && (
              <motion.div
                key="calendar-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in"
              >
                {/* LEFT HALF (Col-span 8): Detailed Interview Calendar Card */}
                <div className="lg:col-span-8 space-y-6">
                  
                  <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-6 space-y-6">
                    
                    {/* Header inside calendar */}
                    <div className="flex justify-between items-center border-b border-[#1c1d1b]/5 pb-4">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-5 h-5 text-[#a8c3a0]" />
                        <h2 className="text-lg font-bold text-[#1c1d1b]">Interview Calendar</h2>
                        <Info size={14} className="text-[#1c1d1b]/30 cursor-help" />
                      </div>

                      {/* Day, Week, Month scale switcher */}
                      <div className="flex items-center bg-[#faf9f6] p-1 rounded-xl border border-[#1c1d1b]/5 shadow-inner">
                        {(["day", "week", "month"] as ViewScale[]).map((scale) => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setViewScale(scale)}
                            className={clsx(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                              viewScale === scale 
                                ? "bg-[#eae8e3] text-[#1c1d1b] shadow-xs" 
                                : "text-[#1c1d1b]/40 hover:text-[#1c1d1b]"
                            )}
                          >
                            {scale}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Day Selection Slider (Only active if Day view is enabled) */}
                    {viewScale === "day" && (
                      <div className="flex space-x-2 bg-[#faf9f6] p-2 rounded-2xl border border-[#1c1d1b]/5 overflow-x-auto">
                        {days.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className={clsx(
                              "flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all",
                              selectedDay === day 
                                ? "bg-[#1c1d1b] text-white" 
                                : "text-[#1c1d1b]/50 hover:bg-[#1c1d1b]/5"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* WEEK VIEW CALENDAR WITH HORIZONTAL DAYS AND VERTICAL HOURS */}
                    {viewScale === "week" && (
                      <div className="border border-[#1c1d1b]/5 rounded-2xl overflow-hidden bg-white shadow-xs">
                        {/* Grid Headers: Empty cell + 7 Days */}
                        <div className="grid grid-cols-8 border-b border-[#1c1d1b]/5 bg-[#faf9f6]">
                          <div className="py-3 text-center text-xs font-bold text-[#1c1d1b]/30 border-r border-[#1c1d1b]/5">
                            Hour
                          </div>
                          {days.map((day) => (
                            <div key={day} className="py-3 text-center text-xs font-bold text-[#1c1d1b]/70 border-r border-[#1c1d1b]/5 last:border-r-0">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Grid Body: Hours Rows */}
                        <div className="divide-y divide-[#1c1d1b]/5">
                          {hours.map((hour) => (
                            <div key={hour} className="grid grid-cols-8 items-stretch min-h-[72px]">
                              
                              {/* Vertical Axis Timestamp (Left side column) */}
                              <div className="flex items-center justify-center text-[10px] font-bold text-[#1c1d1b]/40 bg-[#faf9f6]/40 border-r border-[#1c1d1b]/5 py-2 select-none">
                                {hour}
                              </div>

                              {/* 7 Days Columns */}
                              {days.map((day) => {
                                const cellEvents = events.filter(e => e.day === day && e.hour === hour);
                                const isHovered = dragHoverCell?.day === day && dragHoverCell?.hour === hour;
                                
                                return (
                                  <div
                                    key={day}
                                    onDragOver={(e) => handleDragOver(e, day, hour)}
                                    onDrop={(e) => handleDrop(e, day, hour)}
                                    className={clsx(
                                      "border-r border-[#1c1d1b]/5 last:border-r-0 p-1.5 flex flex-col justify-center relative transition-all min-h-[72px]",
                                      isHovered && "bg-[#a8c3a0]/10 border-2 border-dashed border-[#a8c3a0]"
                                    )}
                                  >
                                    {cellEvents.map((ev) => {
                                      const isDragging = draggingEventId === ev.id;
                                      return (
                                        <div
                                          key={ev.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, ev.id)}
                                          onDragEnd={handleDragEnd}
                                          className={clsx(
                                            "rounded-xl p-2.5 text-left text-[11px] font-bold cursor-grab active:cursor-grabbing transition-all select-none border-l-4 shadow-xs relative group flex items-start gap-1.5",
                                            isDragging && "opacity-40 border-dashed border-2 border-[#1c1d1b]/30",
                                            !isDragging && ev.color === "blue" && "bg-blue-50 text-blue-800 border-blue-500 hover:bg-blue-100",
                                            !isDragging && ev.color === "yellow" && "bg-amber-50 text-amber-800 border-amber-500 hover:bg-amber-100",
                                            !isDragging && ev.color === "green" && "bg-emerald-50 text-emerald-800 border-emerald-500 hover:bg-emerald-100",
                                            !isDragging && ev.color === "pink" && "bg-rose-50 text-rose-800 border-rose-500 hover:bg-rose-100",
                                            !isDragging && ev.color === "purple" && "bg-purple-50 text-purple-800 border-purple-500 hover:bg-purple-100"
                                          )}
                                        >
                                          <GripVertical size={12} className="text-[#1c1d1b]/30 shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <div className="truncate leading-tight">{ev.candidateName}</div>
                                            <div className="text-[9px] opacity-75 font-semibold mt-0.5 flex items-center gap-1">
                                              <Clock size={10} /> {ev.hour}
                                            </div>
                                          </div>
                                          <button 
                                            type="button"
                                            onClick={() => handleCancelActiveEvent(ev)}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded p-0.5 transition-all"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                      );
                                    })}

                                    {/* Ghost indicator trail during active drag */}
                                    {draggingEventId && isHovered && (
                                      <div className="absolute inset-1.5 bg-[#1c1d1b]/5 rounded-xl border border-dashed border-[#1c1d1b]/30 pointer-events-none flex items-center justify-center text-[10px] text-[#1c1d1b]/30 font-bold">
                                        Drop Here
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DAY VIEW CALENDAR (Only lists selected day's hours) */}
                    {viewScale === "day" && (
                      <div className="border border-[#1c1d1b]/5 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <div className="grid grid-cols-4 border-b border-[#1c1d1b]/5 bg-[#faf9f6]">
                          <div className="col-span-1 py-3 text-center text-xs font-bold text-[#1c1d1b]/30 border-r border-[#1c1d1b]/5">
                            Hour
                          </div>
                          <div className="col-span-3 py-3 text-center text-xs font-bold text-[#1c1d1b]">
                            Scheduled Events for {selectedDay}
                          </div>
                        </div>

                        <div className="divide-y divide-[#1c1d1b]/5">
                          {hours.map((hour) => {
                            const cellEvents = events.filter(e => e.day === selectedDay && e.hour === hour);
                            const isHovered = dragHoverCell?.day === selectedDay && dragHoverCell?.hour === hour;
                            
                            return (
                              <div key={hour} className="grid grid-cols-4 items-stretch min-h-[72px]">
                                <div className="col-span-1 flex items-center justify-center text-xs font-bold text-[#1c1d1b]/40 bg-[#faf9f6]/40 border-r border-[#1c1d1b]/5 py-2">
                                  {hour}
                                </div>
                                
                                <div 
                                  onDragOver={(e) => handleDragOver(e, selectedDay, hour)}
                                  onDrop={(e) => handleDrop(e, selectedDay, hour)}
                                  className={clsx(
                                    "col-span-3 p-3 flex flex-col justify-center relative",
                                    isHovered && "bg-[#a8c3a0]/10 border-2 border-dashed border-[#a8c3a0]"
                                  )}
                                >
                                  {cellEvents.map((ev) => (
                                    <div
                                      key={ev.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, ev.id)}
                                      onDragEnd={handleDragEnd}
                                      className={clsx(
                                        "rounded-xl p-3 text-left text-xs font-bold cursor-grab border-l-4 shadow-sm relative group flex items-center gap-2",
                                        ev.color === "blue" && "bg-blue-50 text-blue-800 border-blue-500",
                                        ev.color === "yellow" && "bg-amber-50 text-amber-800 border-amber-500",
                                        ev.color === "green" && "bg-emerald-50 text-emerald-800 border-emerald-500",
                                        ev.color === "pink" && "bg-rose-50 text-rose-800 border-rose-500"
                                      )}
                                    >
                                      <GripVertical size={14} className="text-[#1c1d1b]/30 shrink-0" />
                                      <div className="flex-1">
                                        <p>{ev.candidateName}</p>
                                        <p className="text-[10px] opacity-75 font-semibold mt-0.5">{ev.hour}</p>
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => handleCancelActiveEvent(ev)}
                                        className="text-red-500 hover:bg-red-50 rounded p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* MONTH VIEW CALENDAR (Grid of cells) */}
                    {viewScale === "month" && (
                      <div className="border border-[#1c1d1b]/5 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <div className="grid grid-cols-7 border-b border-[#1c1d1b]/5 bg-[#faf9f6]">
                          {days.map(d => (
                            <div key={d} className="py-2.5 text-center text-xs font-semibold text-[#1c1d1b]/60 border-r border-[#1c1d1b]/5 last:border-r-0">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 grid-rows-5 divide-x divide-y divide-[#1c1d1b]/5 border-t border-[#1c1d1b]/5">
                          {Array.from({ length: 35 }).map((_, idx) => {
                            const dayNumber = (idx % 31) + 1;
                            const matchedDay = days[idx % 7];
                            const dayEvents = events.filter(e => e.day === matchedDay).slice(0, 2);

                            return (
                              <div key={idx} className="min-h-[90px] p-2 space-y-1.5 flex flex-col justify-start">
                                <span className="text-[10px] font-bold text-[#1c1d1b]/30 block">{dayNumber}</span>
                                {dayEvents.map(ev => (
                                  <div 
                                    key={ev.id} 
                                    className={clsx(
                                      "rounded-lg px-2 py-1 text-[9px] font-bold leading-tight truncate border-l-2",
                                      ev.color === "blue" && "bg-blue-50 text-blue-800 border-blue-500",
                                      ev.color === "yellow" && "bg-amber-50 text-amber-800 border-amber-500",
                                      ev.color === "green" && "bg-emerald-50 text-emerald-800 border-emerald-500",
                                      ev.color === "pink" && "bg-rose-50 text-rose-800 border-rose-500"
                                    )}
                                  >
                                    {ev.candidateName.replace("Interview: ", "")}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT HALF (Col-span 4): Weekly Recurring Availability tags display card */}
                <div className="lg:col-span-4 space-y-6">
                  
                  <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-[#1c1d1b]">Weekly Recurring Availability</h3>
                      {!isAddingTag ? (
                        <button 
                          onClick={() => setIsAddingTag(true)} 
                          type="button"
                          className="text-[#3b7a57] underline hover:text-[#2a593e] text-xs font-bold flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Slot
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#1c1d1b]/40 font-bold uppercase tracking-wider">Adding Standard Slot</span>
                      )}
                    </div>

                    {isAddingTag && (
                      <form onSubmit={handleAddNewTag} className="flex items-center gap-2 bg-[#faf9f6] p-2 rounded-xl border border-[#a8c3a0]/30 w-full max-w-sm">
                        <input
                          type="text"
                          placeholder="e.g. 1:00 PM - 3:00 PM"
                          value={newTagText}
                          onChange={(e) => setNewTagText(e.target.value)}
                          className="bg-transparent text-xs p-1 flex-1 focus:outline-none font-medium text-[#1c1d1b]"
                          autoFocus
                          required
                        />
                        <button type="submit" className="bg-[#1c1d1b] text-white px-3 py-1 rounded-lg text-[10px] font-bold">Add</button>
                        <button type="button" onClick={() => setIsAddingTag(false)} className="text-[#b05a5a] text-[10px] font-bold px-1">Cancel</button>
                      </form>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      {availabilityTags.map((tag, idx) => {
                        const isEditing = editingTagIndex === idx;
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center space-x-2 bg-[#faf9f6] text-[#1c1d1b] text-xs px-3.5 py-2 rounded-xl border border-[#1c1d1b]/5 font-medium shadow-xs hover:border-[#1c1d1b]/20 transition-all group"
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={tempTagText}
                                onChange={(e) => setTempTagText(e.target.value)}
                                onBlur={() => handleSaveEditTag(idx)}
                                onKeyDown={(e) => handleKeyDownEditTag(e, idx)}
                                className="bg-white border border-[#a8c3a0] rounded text-xs p-0.5 w-28 focus:outline-none font-medium text-[#1c1d1b]"
                                autoFocus
                              />
                            ) : (
                              <span 
                                onClick={() => handleStartEditTag(idx, tag)}
                                className="cursor-pointer hover:underline select-none"
                                title="Click to edit slot"
                              >
                                {tag}
                              </span>
                            )}
                            {!isEditing && (
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5">
                                <button 
                                  onClick={() => handleStartEditTag(idx, tag)}
                                  type="button"
                                  className="text-[#1c1d1b]/40 hover:text-[#1c1d1b]"
                                  title="Edit slot"
                                >
                                  <Settings size={12} className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTag(idx)}
                                  type="button"
                                  className="text-[#1c1d1b]/40 hover:text-red-500"
                                  title="Delete slot"
                                >
                                  <X size={12} className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "pending" && (
              <motion.div
                key="pending-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* LEFT HALF (Col-span 8): Review Pending Requests */}
                <div className="lg:col-span-8 space-y-6">
                  
                  <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-6 space-y-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-bold text-[#1c1d1b]">Pending Requests</h2>
                        <p className="text-[11px] text-[#1c1d1b]/40 font-medium">Candidates waiting for confirmation.</p>
                      </div>
                      <MoreHorizontal size={18} className="text-[#1c1d1b]/40 cursor-pointer" />
                    </div>

                    <div className="space-y-4 divide-y divide-[#1c1d1b]/5">
                      {pendingRequests.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#1c1d1b]/40 font-semibold">
                          All candidates scheduled!
                        </div>
                      ) : (
                        pendingRequests.map((req, idx) => (
                          <div key={req.id} className={clsx("space-y-3", idx > 0 && "pt-4")}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm text-[#1c1d1b]">{req.candidateName}</p>
                                <p className="text-[10px] text-[#1c1d1b]/50 mt-0.5">
                                  Preferred: {req.preferredDay} at {req.preferredHour}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 text-xs">
                              <button
                                onClick={() => handleApprove(req)}
                                type="button"
                                className="text-[#3b7a57] underline hover:text-[#2a593e] font-bold flex items-center gap-1 group"
                              >
                                Approve
                                <ArrowDownRight size={13} className="group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform text-[#3b7a57]" />
                              </button>
                              <span className="text-[#1c1d1b]/20">•</span>
                              <button
                                onClick={() => handleReject(req)}
                                type="button"
                                className="text-[#b05a5a] underline hover:text-[#8d4747] font-bold"
                              >
                                Reject
                              </button>
                              <span className="text-[#1c1d1b]/20">•</span>
                              <button
                                onClick={() => triggerToast(`Custom slots suggested to ${req.candidateName}`)}
                                type="button"
                                className="text-[#3b7a57] underline hover:text-[#2a593e] font-bold"
                              >
                                Suggest
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT HALF (Col-span 4): Outbox Status panel */}
                <div className="lg:col-span-4 space-y-6">
                  <AnimatePresence>
                    {overlayNotification && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="bg-[#faf6f0] border-2 border-[#b05a5a]/20 rounded-3xl p-6 shadow-sm space-y-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-2 h-full bg-[#b05a5a]" />
                        
                        <div className="flex justify-between items-start pl-2">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-5 h-5 text-[#b05a5a]" />
                            <h3 className="text-sm font-bold text-[#b05a5a] uppercase tracking-wider">
                              Candidate Notification Status
                            </h3>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setOverlayNotification(null)}
                            className="text-[#1c1d1b]/30 hover:text-red-500 p-0.5 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="space-y-3.5 pl-2">
                          <p className="text-xs font-semibold text-[#1c1d1b]/80 leading-relaxed">
                            {overlayNotification}
                          </p>
                          
                          <div className="flex gap-2.5">
                            <div className="bg-[#b05a5a]/10 text-[#b05a5a] px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                              <AlertTriangle size={12} /> Outbox Postponement Email
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                setOverlayNotification(null);
                                triggerToast("Re-dispatched notification outbox queue.");
                              }}
                              className="bg-[#1c1d1b] text-white hover:bg-[#1c1d1b]/80 px-3.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors"
                            >
                              Resend
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === "rules" && (
              <motion.div
                key="rules-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* LEFT HALF (Col-span 8): Scheduling Preferences */}
                <div className="lg:col-span-8 space-y-6">
                  
                  <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-8 space-y-6">
                    <div className="flex items-center space-x-3 border-b border-[#1c1d1b]/5 pb-4">
                      <Sliders className="w-5 h-5 text-[#a8c3a0]" />
                      <h2 className="text-lg font-bold text-[#1c1d1b]">Scheduling Preferences</h2>
                    </div>

                    <form onSubmit={handleSaveRules} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Buffer Time */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-[#1c1d1b]/60 uppercase tracking-wider">Buffer Between Interviews</label>
                          <select
                            value={bufferTime}
                            onChange={(e) => setBufferTime(e.target.value)}
                            className="w-full p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b]"
                          >
                            <option value="None">No buffer</option>
                            <option value="15 mins">15 minutes</option>
                            <option value="30 mins">30 minutes (Recommended)</option>
                            <option value="45 mins">45 minutes</option>
                            <option value="60 mins">1 hour</option>
                          </select>
                        </div>

                        {/* Max Interviews */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-[#1c1d1b]/60 uppercase tracking-wider">Max Interviews Per Day</label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={maxInterviews}
                              onChange={(e) => setMaxInterviews(Number(e.target.value))}
                              className="w-24 p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b] text-center"
                            />
                            <span className="text-xs text-[#1c1d1b]/50 font-medium">interviews/day</span>
                          </div>
                        </div>

                        {/* Advance Notice */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-[#1c1d1b]/60 uppercase tracking-wider">Minimum Advance Notice</label>
                          <select
                            value={minNotice}
                            onChange={(e) => setMinNotice(e.target.value)}
                            className="w-full p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b]"
                          >
                            <option value="None">None</option>
                            <option value="4 hours">4 hours</option>
                            <option value="12 hours">12 hours</option>
                            <option value="24 hours">24 hours (1 day)</option>
                            <option value="48 hours">48 hours (2 days)</option>
                          </select>
                        </div>
                      </div>

                      <hr className="border-[#1c1d1b]/5" />

                      {/* Toggle Switches */}
                      <div className="space-y-4">
                        {/* Auto Approve Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#faf9f6] border border-[#1c1d1b]/5">
                          <div className="space-y-0.5 pr-4">
                            <p className="text-sm font-bold text-[#1c1d1b]">Auto-Approve Matching Requests</p>
                            <p className="text-[11px] text-[#1c1d1b]/40 font-medium">Instantly schedule when candidate preferred time matches your Weekly Recurring Availability.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAutoApprove(!autoApprove)}
                            className={clsx(
                              "w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
                              autoApprove ? "bg-[#3b7a57]" : "bg-neutral-200"
                            )}
                          >
                            <motion.div
                              layout
                              className="bg-white w-4 h-4 rounded-full shadow-md"
                              animate={{ x: autoApprove ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* VIP Override Limit Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#faf9f6] border border-[#1c1d1b]/5">
                          <div className="space-y-0.5 pr-4">
                            <p className="text-sm font-bold text-[#1c1d1b]">Bypass Limits for VIP Candidates</p>
                            <p className="text-[11px] text-[#1c1d1b]/40 font-medium">Allow manual VIP Override schedulers to bypass max interviews/day limits and buffer warnings.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVipOverride(!vipOverride)}
                            className={clsx(
                              "w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
                              vipOverride ? "bg-[#3b7a57]" : "bg-neutral-200"
                            )}
                          >
                            <motion.div
                              layout
                              className="bg-white w-4 h-4 rounded-full shadow-md"
                              animate={{ x: vipOverride ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Form Submit Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingRules}
                          className="w-full md:w-auto px-6 py-3 bg-[#1c1d1b] text-white hover:bg-[#1c1d1b]/90 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 min-w-[150px] disabled:opacity-70"
                        >
                          {savingRules ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Preferences</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* RIGHT HALF (Col-span 4): Playbook card */}
                <div className="lg:col-span-4 space-y-6">
                  
                  <div className="bg-white rounded-3xl border border-[#1c1d1b]/5 shadow-sm p-6 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-[#1c1d1b]/5 pb-3">
                      <HelpCircle className="w-4.5 h-4.5 text-[#a8c3a0]" />
                      <h3 className="text-base font-bold text-[#1c1d1b]">Scheduling Playbook</h3>
                    </div>
                    
                    <div className="space-y-4 text-xs font-medium text-[#1c1d1b]/70 leading-relaxed">
                      <div className="bg-[#faf9f6] p-3 rounded-2xl border border-[#1c1d1b]/5 space-y-1">
                        <p className="font-bold text-[#1c1d1b] text-[11px] uppercase tracking-wider">Buffer Time</p>
                        <p className="text-[10.5px]">A recovery window inserted automatically between adjacent bookings. This guarantees time to write feedback notes and stretch before your next session.</p>
                      </div>

                      <div className="bg-[#faf9f6] p-3 rounded-2xl border border-[#1c1d1b]/5 space-y-1">
                        <p className="font-bold text-[#1c1d1b] text-[11px] uppercase tracking-wider">Daily Limits</p>
                        <p className="text-[10.5px]">Once the daily maximum is reached, that entire calendar day is locked for standard candidates, directing bookings to other available slots in the week.</p>
                      </div>

                      <div className="bg-[#faf9f6] p-3 rounded-2xl border border-[#1c1d1b]/5 space-y-1">
                        <p className="font-bold text-[#1c1d1b] text-[11px] uppercase tracking-wider">VIP Overrides</p>
                        <p className="text-[10.5px]">VIP markers bypass automation. They can force-book onto slots even if the slot is full, buffer times are violated, or daily limits are exceeded.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Floating Action Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-4 z-40">
        
        {/* Override Slot (VIP) Button */}
        <button 
          onClick={() => setShowVIPModal(true)}
          type="button"
          className="flex items-center space-x-2 bg-white text-[#1c1d1b] px-5 py-3 rounded-full hover:shadow-md transition-all font-semibold text-xs border border-[#1c1d1b]/10 shadow-sm"
        >
          <Plus size={16} />
          <span>Override Slot (VIP)</span>
        </button>

      </div>

      {/* VIP Modal */}
      <AnimatePresence>
        {showVIPModal && (
          <div className="fixed inset-0 bg-[#1c1d1b]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#1c1d1b]/5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Star size={18} className="text-purple-600 fill-purple-600 animate-pulse" />
                  VIP Override Slot
                </h3>
                <button type="button" onClick={() => setShowVIPModal(false)} className="text-[#1c1d1b]/40 hover:text-red-500 rounded p-0.5">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddVIP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1c1d1b]/60 mb-1.5">Candidate Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Akira Tanaka" 
                    value={vipName}
                    onChange={(e) => setVipName(e.target.value)}
                    className="w-full p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b]"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1c1d1b]/60 mb-1.5">Day</label>
                    <select 
                      value={vipDay}
                      onChange={(e) => setVipDay(e.target.value)}
                      className="w-full p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b]"
                    >
                      {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1c1d1b]/60 mb-1.5">Preferred Time</label>
                    <select 
                      value={vipHour}
                      onChange={(e) => setVipHour(e.target.value)}
                      className="w-full p-3 bg-[#faf9f6] rounded-xl border border-[#1c1d1b]/10 focus:outline-none focus:ring-1 focus:ring-[#a8c3a0] text-sm font-medium text-[#1c1d1b]"
                    >
                      {hours.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-[#1c1d1b] text-white rounded-xl text-xs font-bold hover:bg-[#1c1d1b]/90 transition-all">
                    Schedule VIP Override
                  </button>
                  <button type="button" onClick={() => setShowVIPModal(false)} className="px-4 py-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
