import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header({ shouldAnimate }: { shouldAnimate: boolean }) {

    const [isOpen, setIsOpen] = useState(false);
    const { pathname } = useLocation();

    const handleClick = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
    }, [isOpen]);

    return (
        <>
            <header className={`relative z-50 px-5 py-5 md:px-10 md:py-10 pb-10 ${shouldAnimate ? 'opacity-0 animate-text-intro [animation-delay:5000ms]' : ''}`}>
                <div className="flex items-center justify-between">
                    {/* Name */}
                    <Link to="/" className="font-cormorant text-3xl md:text-4xl text-wood-accent">
                        IC Method.
                    </Link>
                    {/* Links (Desktop View) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex-row items-center gap-12">
                            <Link to="/" className={`font-didot text-x relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:bg-wood-dark after:transition-all after:duration-300 hover:after:w-full hover:text-wood-dark transition-colors duration-300 ${pathname === '/' ? 'text-wood-dark after:w-full' : 'text-wood-accent after:w-0'}`}>About</Link>
                            <Link to="/people" className={`font-didot text-x relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:bg-wood-dark after:transition-all after:duration-300 hover:after:w-full hover:text-wood-dark transition-colors duration-300 ${pathname === '/people' ? 'text-wood-dark after:w-full' : 'text-wood-accent after:w-0'}`}>People</Link>
                            <Link to="/studio" className={`font-didot text-x relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:bg-wood-dark after:transition-all after:duration-300 hover:after:w-full hover:text-wood-dark transition-colors duration-300 ${pathname === '/studio' ? 'text-wood-dark after:w-full' : 'text-wood-accent after:w-0'}`}>Studio</Link>
                    </div>
                    {/* Hamburger Bar */}
                    <div id="toggleMenu" onClick={handleClick} className={`relative p-4 md:hidden z-50 ${isOpen ? 'hamburger-toggle' : ''}`}>
                        <div className="relative w-4 h-0.5 rounded-full bg-wood-accent
                                            before:content-[''] before:absolute before:w-4 before:h-0.5 before:rounded-full before:-translate-y-1.5 before:bg-wood-accent
                                            before:transition-all before:duration-150
                                            after:content-[''] after:absolute after:w-4 after:h-0.5 after:rounded-full after:translate-y-1.5 after:bg-wood-accent
                                            after:transition-all after:duration-150">
                        </div>
                    </div>
                </div>
            </header>
            {/* Links (Mobile View) */}
            <div className={`fixed inset-0 z-40 transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col bg-wood-light items-center justify-center h-full gap-5">
                    <Link to="/" onClick={() => setIsOpen(false)} className={`font-didot text-xl tracking-widest transition-all duration-500 ease-in-out hover:text-wood-dark md:opacity-100 ${pathname === '/' ? 'text-wood-dark' : 'text-wood-accent'} ${isOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}>About</Link>
                    <Link to="/people" onClick={() => setIsOpen(false)} className={`font-didot text-xl tracking-widest transition-all duration-500 ease-in-out hover:text-wood-dark ${pathname === '/people' ? 'text-wood-dark' : 'text-wood-accent'} ${isOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}>People</Link>
                    <Link to="/studio" onClick={() => setIsOpen(false)} className={`font-didot text-xl tracking-widest transition-all duration-500 ease-in-out hover:text-wood-dark ${pathname === '/studio' ? 'text-wood-dark' : 'text-wood-accent'} ${isOpen ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}>Studio</Link>
                </div>
            </div>
        </>
    )
}

export function Footer({ shouldAnimate }: { shouldAnimate: boolean }) {
    return (
        <footer className={`relative z-40 px-5 py-5 md:px-10 md:py-10 pt-10 flex justify-between items-end ${shouldAnimate ? 'opacity-0 animate-text-intro [animation-delay:5000ms]' : ''}`}>
            {/* Socials */}
            <div className="flex flex-row gap-6">
                <a href="https://www.instagram.com/icmethod_official/" target="_blank" className="group">
                    <svg className="w-6 h-6" viewBox="3 3 26 26" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="instaGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#fdf497" />
                                <stop offset="30%" stopColor="#fd5949" />
                                <stop offset="60%" stopColor="#d6249f" />
                                <stop offset="100%" stopColor="#8a3ab9" />
                            </linearGradient>
                        </defs>
                        <g className="insta-icon">
                            <path d="M22.3,8.4c-0.8,0-1.4,0.6-1.4,1.4c0,0.8,0.6,1.4,1.4,1.4c0.8,0,1.4-0.6,1.4-1.4C23.7,9,23.1,8.4,22.3,8.4z"/>
                            <path d="M16,10.2c-3.3,0-5.9,2.7-5.9,5.9s2.7,5.9,5.9,5.9s5.9-2.7,5.9-5.9S19.3,10.2,16,10.2z M16,19.9c-2.1,0-3.8-1.7-3.8-3.8c0-2.1,1.7-3.8,3.8-3.8c2.1,0,3.8,1.7,3.8,3.8C19.8,18.2,18.1,19.9,16,19.9z"/>
                            <path d="M20.8,4h-9.5C7.2,4,4,7.2,4,11.2v9.5c0,4,3.2,7.2,7.2,7.2h9.5c4,0,7.2-3.2,7.2-7.2v-9.5C28,7.2,24.8,4,20.8,4z M25.7,20.8c0,2.7-2.2,5-5,5h-9.5c-2.7,0-5-2.2-5-5v-9.5c0-2.7,2.2-5,5-5h9.5c2.7,0,5,2.2,5,5V20.8z"/>
                        </g>
                    </svg>
                </a>
                <a href="https://www.xiaohongshu.com/user/profile/6900a9420000000037030f43?xsec_token=ABYi2wxla19L6JVlymMruWLpln4XrVMahFeUutocUsYQc%3D&xsec_source=pc_search" target="_blank">
                    <svg className="w-6 h-6" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                        <g className="rednote-icon" transform="scale(1) translate(0,0)">
                            <path d="M 29,0.33332825 C 13.959937,3.4666748 1.5356731,15.204498 0,31 -1.586103,47.314209 0,64.597672 0,81 v 102 c 0,18.76035 -4.7369685,44.19888 7.3333335,60 C 20.372129,260.06897 44.156731,256 63,256 h 111 35 c 5.78276,0 12.33244,0.84741 18,-0.33333 15.0401,-3.13336 27.46432,-14.87115 29,-30.66667 1.58612,-16.31419 0,-33.59769 0,-50 V 73 C 256,54.239685 260.73697,28.801102 248.66667,13 235.62787,-4.0689697 211.84329,0 193,0 H 82 47 C 41.217228,0 34.667561,-0.84741211 29,0.33332825 M 120,91 l -7,19 h 12 l -10,24 9,1 c -0.98794,2.68155 -2.31718,7.73317 -4.33334,9.83334 C 118.18945,146.3721 115.92654,146 114,146 c -4.35942,0 -13.16798,1.80539 -15.5,-3 -1.069664,-2.20416 0.465553,-4.98451 1.333336,-7 1.813624,-4.21228 4.222554,-8.51549 5.166664,-13 -2.17548,0 -4.92464,0.42967 -7,-0.33333 -7.778526,-2.85974 0.874031,-15.36435 2.66666,-19.66667 1.25875,-3.020981 2.75652,-9.584732 5.5,-11.5 C 110.01874,88.810822 115.88325,90.674988 120,91 m -79,63 c 2.750713,0 6.837379,0.81721 8.5,-2 1.769028,-2.99753 0.5,-9.58963 0.5,-13 V 106 C 50,102.90659 48.438198,93.464493 51.166668,91.5 53.41069,89.884308 62.832935,90.226166 63.833332,93 65.47065,97.539825 64,105.16241 64,110 v 32 c 0,5.48389 0.949112,11.8645 -1.333332,17 -2.177158,4.89861 -12.303417,9.27243 -17.333336,5.5 C 43.120155,162.84012 41.545292,156.59013 41,154 M 193,91 v 5 c 3.72887,0 8.4108,-0.763367 12,0.333328 11.97635,3.659424 11,15.422502 11,25.666672 1.99706,0 4.04419,-0.15562 6,0.33333 11.49335,2.87334 10,14.36401 10,23.66667 0,4.95615 0.93086,10.82184 -2.33333,15 -3.59567,4.60246 -9.48195,4 -14.66667,4 -1.6116,0 -4.26318,0.51051 -5.66667,-0.5 -2.62326,-1.88875 -3.78159,-7.50485 -4.33333,-10.5 3.28711,0 9.2179,1.12517 11.83333,-1.33334 C 219.9164,149.76859 218.65411,138.43454 215,136.5 c -1.93661,-1.02527 -4.88672,-0.5 -7,-0.5 h -15 v 29 h -14 v -29 h -14 v -14 h 14 v -12 h -9 V 96 h 9 v -5 h 14 m -32,5 v 14 h -8 v 42 h 13 v 13 H 120 L 125.33334,152.5 138,152 v -42 h -8 V 96 h 31 m 57,14 c 0,-2.84204 -0.51608,-6.25871 0.33333,-9 3.34434,-10.793121 19.61577,-2.093994 11.5,6.83333 -0.92279,1.01507 -2.54419,1.51106 -3.83333,1.83334 C 223.43948,110.30679 220.61993,110 218,110 M 41,110 36.833332,147 30,159 24,143 27,110 h 14 m 46,0 3,33 -6,15 h -2 c -5.366936,-8.49765 -6.053299,-17.26251 -7,-27 -0.672195,-6.91406 -2,-14.04004 -2,-21 h 14 m 106,0 v 12 h 9 v -12 h -9 m -75,42 -5,13 H 91 L 96.333336,151.5 104,151.66666 Z"/>
                        </g>
                    </svg>
                </a>
            </div>
            {/* Address */}
            <div className="font-didot text-right text-[clamp(0.8rem,1.3vw,1.2rem)] text-wood-accent">
                <p><span className="md:inline ">434 Burwood Rd,</span><br className="md:hidden" /><span className="md:inline"> Hawthorn VIC 3122</span></p>
            </div>
        </footer>
    )
}
