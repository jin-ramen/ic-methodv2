import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { BASE, extractError } from '../utils/apiUtils'
import type { SessionType } from '../types/session'
import SessionInfo from '../components/SessionInfo'

type CheckoutResponse = {
    payment_id: string
    booking_id: string
    payment_intent_id: string
    client_secret: string
    amount: string | number
    currency: string
    status: string
    expires_at: string | null
}

type Status = 'loading' | 'mounting' | 'ready' | 'processing' | 'success' | 'error'

const ELEMENT_CONTAINER_ID = 'airwallex-drop-in-element'

const labelClass = "font-didot text-wood-text/60 text-xs md:text-sm tracking-widest uppercase"

function TotalRow({ total }: { total: string }) {
    return (
        <div className="border-t border-wood-text/15 mt-3 pt-3 flex items-baseline justify-between">
            <span className="font-didot text-wood-text/40 text-[10px] tracking-widest uppercase">Total</span>
            <span className="font-cormorant text-wood-text text-2xl">{total}</span>
        </div>
    )
}

type Props = { onChanged?: () => void }

export default function Checkout({ onChanged }: Props = {}) {
    const { bookingId } = useParams<{ bookingId: string }>()
    const navigate = useNavigate()
    const { state } = useLocation()
    const { isLoggedIn, token } = useAuth()

    const [status, setStatus] = useState<Status>('loading')
    const [errorMsg, setErrorMsg] = useState('')
    const [intent, setIntent] = useState<CheckoutResponse | null>(null)
    const [leaving, setLeaving] = useState(false)
    const elementMounted = useRef(false)

    const session = (state as { session?: SessionType } | null)?.session

    useEffect(() => {
        if (!isLoggedIn || !token) {
            navigate('/login', { state: { next: `/checkout/${bookingId}` } })
            return
        }
        if (!bookingId) {
            setStatus('error')
            setErrorMsg('Missing booking id.')
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch(`${BASE}/api/payments/checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        booking_id: bookingId,
                        return_url: `${window.location.origin}/account`,
                    }),
                })
                const body = await res.json().catch(() => ({}))
                if (!res.ok) {
                    if (!cancelled) {
                        setErrorMsg(extractError(body) || `HTTP ${res.status}`)
                        setStatus('error')
                    }
                    return
                }
                if (!cancelled) {
                    setIntent(body as CheckoutResponse)
                    setStatus('mounting')
                }
            } catch (err) {
                if (!cancelled) {
                    setErrorMsg((err as Error).message)
                    setStatus('error')
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [bookingId, isLoggedIn, token, navigate])

    useEffect(() => {
        if (!intent || elementMounted.current) return
        elementMounted.current = true

        type DropInElement = {
            mount: (target: string | HTMLElement) => unknown
            unmount: () => unknown
            destroy?: () => unknown
            on: (event: string, handler: (e: { detail?: { error?: { message?: string } } }) => void) => void
        }

        let dropIn: DropInElement | null = null
        ;(async () => {
            try {
                const sdk = await import('@airwallex/components-sdk')
                
                await sdk.init({
                    env: 'demo',                     // change to 'production' when live
                    enabledElements: ['payments'],
                })

                const created = await sdk.createElement('dropIn', {
                    intent_id: intent.payment_intent_id,
                    client_secret: intent.client_secret,
                    currency: intent.currency,
                    country_code: 'AU',
                    applePayRequestOptions: { countryCode: 'AU' },
                    googlePayRequestOptions: { countryCode: 'AU', buttonColor: 'black' },
                    layout: {
                        type: 'tab'
                    },
                    appearance: {
                        mode: 'dark',
                        variables: {
                            // Core branding
                            colorBackground: '#6B432E',   // Your original wood-dark
                            colorText: '#F5F5F5',         // Neutral off-white for maximum readability
                            colorPrimary: '#D4A373',      // Modern tan/gold accent
                            
                            // Modern typography
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSizeBase: '15px',
                            gridUnit: '4px',              // Tighter spacing for a modern feel
                        },
                        rules: {
                            '.Input': {
                                backgroundColor: '#4a2e20',  // Darker shade of your background for depth
                                borderColor: '#8b573b',      // Lighter shade of your background for definition
                                borderRadius: '8px',         // More rounded, modern corners
                                transition: 'all 0.2s ease', // Smooth interaction
                            },
                            '.Input:focus': {
                                borderColor: '#e3ddcf',      // Pop accent on focus
                                boxShadow: '0 0 0 2px rgba(212, 163, 115, 0.2)', // Modern "glow"
                            },
                            '.Input:active': {
                                borderColor: '#e3ddcf',      // Pop accent on focus
                                boxShadow: '0 0 0 2px rgba(212, 163, 115, 0.2)', // Modern "glow"
                            },
                            '.Label': {
                                fontWeight: '500',
                                marginBottom: '8px',
                                color: '#F5F5F5',
                            },
                            '.Button': {
                                backgroundColor: '#D4A373',  // Strong CTA color
                                color: '#6B432E',            // Dark text on light button for clarity
                                borderRadius: '8px',
                                padding: '12px',
                                fontWeight: '600',
                            },
                            '.Button:hover': {
                                backgroundColor: '#1C1210',  // --color-wood-bg (Darkest tone for hover effect)
                                cursor: 'pointer',
                            },
                            '.Placeholder': {
                                color: 'rgba(245, 245, 245, 0.4)', // Faint version of main text
                            },
                        },
                    },

                } as any)

                if (!created) {
                    setErrorMsg('Failed to initialize Airwallex element.')
                    setStatus('error')
                    return
                }

                dropIn = created as unknown as DropInElement
                const container = document.getElementById(ELEMENT_CONTAINER_ID)
                if (container) dropIn.mount(container)

                dropIn.on('ready', () => setStatus('ready'))
                dropIn.on('success', () => setStatus('success'))
                dropIn.on('error', (event) => {
                    const error = event?.detail?.error;
                    
                    // Check if the payment actually SUCCEEDED but the frontend is just out of sync
                    if (error?.message?.includes('invalid state') || error?.message?.includes('already succeeded')) {
                        console.log('Webhook beat the frontend. Treating as success.');
                        setStatus('success');
                        return;
                    }

                    setErrorMsg(error?.message ?? 'Payment failed.');
                    setStatus('error');
                });
            } catch (err) {
                setErrorMsg((err as Error).message)
                setStatus('error')
            }
        })()

        return () => {
            try {
                dropIn?.destroy?.() ?? dropIn?.unmount?.()
            } catch {
                /* noop */
            }
            elementMounted.current = false
        }
    }, [intent])

    const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
    useEffect(() => {
        if (!intent?.expires_at || status === 'success') return
        const expiry = new Date(intent.expires_at).getTime()
        const tick = () => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
            setSecondsLeft(remaining)
            if (remaining === 0) {
                setStatus('error')
                setErrorMsg('Your hold has expired. The session slot has been released.')
            }
        }
        tick()
        const id = window.setInterval(tick, 1000)
        return () => window.clearInterval(id)
    }, [intent?.expires_at, status])

    const formatCountdown = (s: number | null) => {
        if (s === null) return ''
        const mm = Math.floor(s / 60).toString().padStart(2, '0')
        const ss = (s % 60).toString().padStart(2, '0')
        return `${mm}:${ss}`
    }

    const cancelAndLeave = async () => {
        setLeaving(true)
        if (bookingId && token) {
            try {
                await fetch(`${BASE}/api/payments/booking/${bookingId}/cancel`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                })
            } catch {
                /* noop — sweeper will reclaim the slot */
            }
        }
        onChanged?.()
        setTimeout(() => navigate('/booking'), 300)
    }

    if (status === 'success') {
        return (
            <div className="flex-1 flex items-center justify-center px-5 animate-text-in">
                <div className="text-center animate-fade-in">
                    <div className="mb-6 flex justify-center">
                        {/* A simple checkmark icon or your brand logo */}
                        <div className="h-16 w-16 bg-wood-text/10 rounded-full flex items-center justify-center">
                            <span className="text-wood-dark text-3xl">✓</span>
                        </div>
                    </div>
                    <p className="font-cormorant text-wood-dark text-4xl mb-3">Payment received.</p>
                    <p className="font-didot text-wood-accent text-sm tracking-widest mb-8">
                        Your {intent?.amount} {intent?.currency} payment was successful.<br/>
                        A receipt has been emailed to you.
                    </p>
                    <button
                        onClick={() => navigate('/account')}
                        className="bg-wood-accent/80 text-white px-8 py-3 rounded-xl font-didot text-xs tracking-widest hover:bg-wood-dark/90 transition-all"
                    >
                        VIEW MY DASHBOARD
                    </button>
                </div>
            </div>
        )
    }

    const total = intent ? `${intent.amount} ${intent.currency}` : '—'

    const PaymentArea = (
        <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col gap-1">
                <p className={labelClass}>Secure Checkout</p>
                <p className="font-didot text-wood-text/50 text-xs tracking-wide">
                    Pay to confirm your booking.
                </p>
            </div>

            {/* {intent?.expires_at && status !== 'error' && secondsLeft !== null && (
                <div className="flex items-center justify-between gap-3 border-b border-wood-text/15 pb-4">
                    <p className="font-didot text-wood-text/50 text-[10px] tracking-widest uppercase">
                        Your slot is held for
                    </p>
                    <span className={`font-cormorant text-2xl tabular-nums ${secondsLeft <= 60 ? 'text-red-300' : 'text-wood-text'}`}>
                        {formatCountdown(secondsLeft)}
                    </span>
                </div>
            )} */}

            {(status === 'loading' || status === 'mounting') && (
                <p className="font-didot text-wood-text/60 text-sm tracking-widest">Preparing checkout…</p>
            )}

            <div id={ELEMENT_CONTAINER_ID} className="min-h-[420px] p-0 bg-wood-accent rounded-xl" />

            {status === 'error' && (
                <p className="font-didot text-red-300 text-xs tracking-widest">{errorMsg}</p>
            )}

            <button
                type="button"
                onClick={cancelAndLeave}
                className="font-didot text-wood-text/40 hover:text-wood-text/70 text-xs tracking-widest text-left transition-colors duration-200"
            >
                ← Cancel and return to booking
            </button>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div
                className={`rounded-xl bg-wood-accent w-full md:max-w-5xl px-6 py-8 md:px-10 md:py-12 opacity-0 animate-fade-in ${leaving ? 'animate-fade-out' : ''}`}
                style={{ animationDuration: '0.4s', animationFillMode: 'forwards' }}
            >
                {/* Combined Container: Stacked on mobile, 3-col grid on desktop */}
                <div className="flex flex-col gap-10 md:grid md:grid-cols-5 md:gap-16">
                    
                    {/* Back Button: Shows first on mobile, hidden or positioned on desktop */}
                    <div className="md:hidden">
                        <button
                            type="button"
                            onClick={cancelAndLeave}
                            className="font-didot text-wood-text/40 text-xs tracking-widest text-left"
                        >
                            ← Back to booking
                        </button>
                    </div>

                    {/* Payment Area: 3rd on mobile (order-3), 1st on desktop (spans 2 cols) */}
                    <div className="order-3 md:order-1 md:col-span-3 min-h-[450px]">
                        {PaymentArea}
                    </div>

                    {/* Session Info: 2nd on mobile (order-2), 2nd on desktop (occupies 1 col) */}
                    {session && (
                        <div className="order-2 md:order-2  md:col-span-2">

                            {intent?.expires_at && status !== 'error' && secondsLeft !== null && (
                                <div className="flex items-center justify-between gap-3 border-b border-wood-text/15 pb-4 mb-4">
                                    <p className="font-didot text-wood-text/50 text-[10px] tracking-widest uppercase">
                                        Your slot is held for
                                    </p>
                                    <span className={`font-cormorant text-2xl tabular-nums ${secondsLeft <= 60 ? 'text-red-300' : 'text-wood-text'}`}>
                                        {formatCountdown(secondsLeft)}
                                    </span>
                                </div>
                            )}


                            <SessionInfo session={session}>
                                <TotalRow total={total} />
                            </SessionInfo>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}