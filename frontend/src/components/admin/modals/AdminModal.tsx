import { useState } from 'react';

type Props = {
    onClose: () => void;
    children: (handleClose: () => void) => React.ReactNode;
};

export default function AdminModal({ onClose, children }: Props) {
    const [closing, setClosing] = useState(false);
    const handleClose = () => setClosing(true);
    const handleAnimationEnd = () => { if (closing) onClose(); };

    return (
        <div className="lg:bg-black/40 fixed inset-0 z-50 flex items-center justify-center">
            <div
                className={`absolute inset-0 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />
            <div
                className={`modal relative bg-wood-dark p-8 w-full max-w-md mx-4 opacity-0 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`}
                onAnimationEnd={handleAnimationEnd}
            >
                {children(handleClose)}
            </div>
        </div>
    );
}
