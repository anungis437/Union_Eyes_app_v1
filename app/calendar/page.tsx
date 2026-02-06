/**
 * Calendar Page - Main Component
 * 
 * Integrates all calendar components into a complete calendar interface.
 * Handles state management and API interactions.
 * 
 * @module app/calendar/page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarView } from '@/components/calendar/CalendarView';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { EventDialog } from '@/components/calendar/EventDialog';
import { CalendarSyncManager } from '@/components/calendar/CalendarSyncManager';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';

export default function CalendarPage() {
  const t = useTranslations();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [syncManagerOpen, setSyncManagerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchCalendars();
  }, []);

  useEffect(() => {
    if (selectedCalendarId) {
      fetchEvents(selectedCalendarId);
    }
  }, [selectedCalendarId]);

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/calendars');
      const data = await response.json();
      
      setCalendars(data.calendars || []);
      
      // Select first calendar by default
      if (data.calendars && data.calendars.length > 0) {
        setSelectedCalendarId(data.calendars[0].id);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (calendarId: string) => {
    try {
      const response = await fetch(`/api/calendars/${calendarId}/events`);
      const data = await response.json();
      
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleCreateEvent = (date?: Date) => {
    setSelectedEvent(null);
    setInitialDate(date);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setInitialDate(undefined);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (selectedEvent) {
        // Update existing event
        await fetch(`/api/calendars/${selectedCalendarId}/events/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new event
        await fetch(`/api/calendars/${selectedCalendarId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }

      // Refresh events
      await fetchEvents(selectedCalendarId);
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/calendars/${selectedCalendarId}/events/${eventId}`, {
        method: 'DELETE',
      });

      // Refresh events
      await fetchEvents(selectedCalendarId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const handleToggleCalendarVisibility = (calendarId: string, visible: boolean) => {
    setCalendars(prev =>
      prev.map(cal =>
        cal.id === calendarId ? { ...cal, visibility: visible } : cal
      )
    );
  };

  const handleSyncCalendar = async (calendarId: string) => {
    // Trigger sync via API
    try {
      const calendar = calendars.find(c => c.id === calendarId);
      if (!calendar?.connectionId) return;

      await fetch(`/api/calendar-sync/connections/${calendar.connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localCalendarId: calendarId,
          externalCalendarId: calendar.externalCalendarId,
        }),
      });

      // Refresh events
      await fetchEvents(selectedCalendarId);
    } catch (error) {
      console.error('Error syncing calendar:', error);
      alert('Failed to sync calendar');
    }
  };

  // Filter visible events
  const visibleEvents = events.filter(event => {
    const calendar = calendars.find(cal => cal.id === event.calendarId);
    return calendar?.visibility !== false;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">{t('calendar.loadingCalendars')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <CalendarSidebar
        calendars={calendars}
        selectedCalendarId={selectedCalendarId}
        onSelectCalendar={setSelectedCalendarId}
        onToggleVisibility={handleToggleCalendarVisibility}
        onCreateCalendar={() => {
          // TODO: Implement calendar creation dialog
          alert('Calendar creation coming soon!');
        }}
        onSyncCalendar={handleSyncCalendar}
        onManageSync={() => setSyncManagerOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          <div className="flex space-x-2">
            <Button onClick={() => handleCreateEvent()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('calendar.newEvent')}
            </Button>
            <Button variant="outline" onClick={() => setSyncManagerOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              {t('calendar.syncSettings')}
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {selectedCalendarId ? (
          <CalendarView
            calendarId={selectedCalendarId}
            events={visibleEvents}
            onEventClick={handleEditEvent}
            onDateClick={(date) => console.log('Date clicked:', date)}
            onCreateEvent={handleCreateEvent}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">{t('calendar.noCalendarSelected')}</p>
              <Button onClick={() => alert('Create calendar coming soon!')}>
                {t('calendar.createFirstCalendar')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        initialDate={initialDate}
        calendarId={selectedCalendarId}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <CalendarSyncManager
        open={syncManagerOpen}
        onOpenChange={setSyncManagerOpen}
      />
    </div>
  );
}
