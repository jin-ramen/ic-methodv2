import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Card({ img, name, role, bio, isHidden, onOpen, onClose }: {
    img: string; name: string; role: string; bio: string;
    isHidden: boolean; onOpen: () => void; onClose: () => void;
}) {

    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        document.body.classList.toggle('overflow-hidden', isOpen);
        return () => { document.body.classList.remove('overflow-hidden'); };
    }, [isOpen]);

    const handleOpen = () => {
        setIsOpen(true);
        onOpen();
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            onClose();
        }, 300);
    };

    return (
        <div className={`transition-opacity duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div onClick={handleOpen} className="overflow-hidden card w-full">
                <img className="w-full aspect[4/5] object-cover" src={img} alt="profile-picture" />
            </div>
            <div className="mt-3 xl:flex xl:justify-between">
                <p className="font-cormorant font-bold text-sm md:text-lg text-wood-dark">{name}</p>
                <p className="font-cormorant text-sm md:text-lg text-wood-accent xl:self-center">{role}</p>
            </div>

            {isOpen && createPortal(
                <div className={`fixed inset-0 z-60 p-10 flex items-center justify-center ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose}>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-10 max-w-4xl w-full">
                        <img className="card w-40 md:w-60 aspect[4/5] object-cover shrink-0" src={img} alt="profile-picture" />
                        <div className="flex flex-col">
                            <p className="font-cormorant text-md md:text-lg text-wood-dark font-bold">{name}</p>
                            <p className="font-cormorant text-md md:text-lg text-wood-dark font-bold">{role}</p>
                            <p className="font-cormorant pt-6 text-sm md:text-md text-wood-accent">{bio}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}