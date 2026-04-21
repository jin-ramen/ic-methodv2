import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ProfileCard({ img, name, role, bio, isHidden, onOpen, onClose }: {
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
                <img className="w-full aspect-[2/3] object-cover" src={img} alt="profile-picture" />
            </div>
            <div className="mt-3 xl:flex xl:justify-between">
                <p className="font-cormorant font-bold text-sm md:text-md text-wood-primary">{name}</p>
                <p className="font-cormorant text-sm md:text-md text-wood-accent xl:self-center">{role}</p>
            </div>

            {isOpen && createPortal(
                <div className={`fixed inset-5 z-60 p-10 flex items-start pt-24 justify-center md:items-center md:pt-10 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose}>
                    <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-10 max-w-4xl w-full">
                        <img className="card w-[45vw] aspect-2/3 md:w-60 object-cover shrink-0" src={img} alt="profile-picture" />
                        <div className="flex flex-col text-center md:text-left">
                            <p className="font-cormorant text-md md:text-xl text-wood-primary font-bold">{name}</p>
                            <p className="font-cormorant text-md md:text-xl text-wood-primary font-bold">{role}</p>
                            <p className="font-cormorant pt-6 text-sm md:text-lg text-wood-accent">{bio}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}