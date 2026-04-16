import flower_dark from "../assets/flower_window_dark.jpg"
import flower_light from "../assets/flower_window_sun.jpg"

export default function Studio() {
    const photos = [
        { img: flower_dark },
        { img: flower_light },
    ]

    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 w-full overflow-x-hidden z-20 px-5 lg:px-30 gap-5 lg:gap-10'>
            {photos.map((photo, index) => (
                <div
                    key={index}
                    className="opacity-0 animate-text-intro fill-both w-full aspect-[3/4] md:aspect-[4/5] xl:aspect-square overflow-hidden"
                    style={{ animationDelay: `${index * 0.2}s` }}
                >
                    <img className="w-full h-full object-cover scale-125 sm:scale-110 xl:scale-100 transition-transform duration-300" src={photo.img} />
                </div>
            ))}
        </div>
    )
}