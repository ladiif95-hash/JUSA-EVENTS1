import { CalendarDays, Clock3, MapPin, UserRound, X } from 'lucide-react';

export type EventTicketData = {
  title: string;
  date: string;
  time: string;
  venue: string;
  attendee: string;
  dataUrl?: string;
};

export default function EventTicket({ ticket, onClose }: { ticket: EventTicketData; onClose?: () => void }) {
  return (
    <article className="event-ticket">
      <header className="event-ticket-head">
        <div className="event-ticket-brand">
          <img src="/images/jusa-logo.png" alt="JUSA logo" />
          <span><b>JUSA</b> Events</span>
          <em className="going-pill"><i /> Going</em>
        </div>
        {onClose && <button className="event-ticket-close" type="button" onClick={onClose} aria-label="Close"><X /></button>}
        <h2>{ticket.title}</h2>
      </header>
      <div className="event-ticket-meta">
        <div><CalendarDays /><small>DATE</small><b>{ticket.date}</b></div>
        <div><Clock3 /><small>TIME</small><b>{ticket.time}</b></div>
        <div><MapPin /><small>VENUE</small><b>{ticket.venue}</b></div>
        <div><UserRound /><small>ATTENDEE</small><b>{ticket.attendee}</b></div>
      </div>
      <div className="event-ticket-perforation" aria-hidden="true" />
      <div className="event-ticket-qr">
        <div className="qr-frame">
          <span className="qr-corner tl" />
          <span className="qr-corner tr" />
          <span className="qr-corner bl" />
          <span className="qr-corner br" />
          {ticket.dataUrl
            ? <img src={ticket.dataUrl} alt="Event QR ticket" />
            : <div className="qr-placeholder"><span>JUSA</span><span>EVENT PASS</span></div>}
        </div>
        <p>Your seat is reserved. Show this ticket at the entrance.</p>
      </div>
    </article>
  );
}
