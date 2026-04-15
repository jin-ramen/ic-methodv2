export default function Card({ img, name, role }: { img: string; name: string; role: string }) {
    return (
        <div>
            <div className="overflow-hidden rounded-md w-full">
                <img className="w-full h-full object-cover" src={img} alt="profile-picture" />
            </div>
            <div className="mt-3 md:flex md:justify-between">
                <p className="font-cormorant text-lg">{name}</p>
                <p className="font-playfair text-sm text-wood-accent md:self-center">{role}</p>
            </div>
        </div>
    )
}