export default function Card({ img, name, role }: { img: string; name: string; role: string }) {
    return (
        <div>
            <div className="overflow-hidden rounded-md w-full">
                <img className="w-full h-full object-cover" src={img} alt="profile-picture" />
            </div>
            <div className="mt-3 xl:flex xl:justify-between">
                <p className="font-cormorant text-lg">{name}</p>
                <p className="font-playfair text-sm text-wood-accent xl:self-center">{role}</p>
            </div>
        </div>
    )
}