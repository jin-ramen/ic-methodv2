export default function Card({ img, name, role }: { img: string; name: string; role: string }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 px-9">
            <div className="overflow-hidden rounded-md aspect-[3/4] w-full">
                <img className="w-full h-full object-cover" src={img} alt="profile-picture" />
            </div>
            <div className="mt-3">
                <p className="font-cormorant text-lg">{name}</p>
                <p className="text-sm text-wood-accent">{role}</p>
            </div>
        </div>
    )
}