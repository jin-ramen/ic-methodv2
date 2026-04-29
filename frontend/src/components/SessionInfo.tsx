import type { ReactNode } from 'react'

import type { SessionType } from '../types/session'
import { formatTime, formatDate } from '../utils/dateUtils'

type Props = {
    session: SessionType
    children?: ReactNode
}

export default function SessionInfo({ session, children }: Props) {
    return (
        <div className="rounded-xl bg-wood-dark/80 px-6 py-6 flex flex-col gap-3">
            <p className="font-didot text-wood-text/40 text-xs tracking-widest uppercase">Your Session</p>

            {session.start_time && (
                <h2 className="font-cormorant text-wood-text text-4xl leading-tight">
                    {formatTime(session.start_time)}
                    {session.end_time && (
                        <>
                            <br />
                            <span className="text-wood-text/60 text-2xl">– {formatTime(session.end_time)}</span>
                        </>
                    )}
                </h2>
            )}

            {session.start_time && (
                <p className="font-didot text-wood-text/80 text-sm tracking-widest mt-1">
                    {formatDate(session.start_time)}
                </p>
            )}

            {session.method_name && (
                <p className="font-didot text-wood-text/60 text-xs tracking-widest mt-1">{session.method_name}</p>
            )}

            {session.instructor && (
                <p className="font-didot text-wood-text/50 text-xs tracking-widest mt-1">with {session.instructor}</p>
            )}

            {session.capacity > 0 && (
                <p className="font-didot text-wood-text/30 text-xs tracking-widest mt-1">
                    {session.capacity} spot{session.capacity !== 1 ? 's' : ''} available
                </p>
            )}

            <p className="font-didot text-red-400 text-[11px] leading-relaxed tracking-wide mt-3 pt-3 border-t border-wood-text/10">
                <span className="text-red-400/60">Note:</span> Cancellations made less than 12 hours before
                the session are considered late and only receive a partial refund — a 20% fee is retained.
            </p>

            {children}
        </div>
    )
}
