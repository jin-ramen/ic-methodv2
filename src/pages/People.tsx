import { useState } from 'react'
import Card from "../components/Card"
import luffy from "../assets/luffy.jpg"

export default function People() {
    const team = [
        {  name: "Ivy Chen", role: "Founder & Pilates Instructor", img: luffy, bio: "In a vast ocean where dreams roar louder than cannon fire, One Piece follows Monkey D. Luffy, a rubber-bodied boy chasing the legendary treasure of Gol D. Roger. With his crew by his side, each island becomes a tale of laughter, loss, and unbreakable bonds, as Luffy sails not just to become Pirate King, but to live freely in a world without limits." },
        {  name: "Bob", role: "Pilates Instructor", img: luffy, bio: "Bob specializes in reformer Pilates." },
        {  name: "Bob", role: "Pilates Instructor", img: luffy, bio: "Bob specializes in reformer Pilates." },
        {  name: "Bob", role: "Pilates Instructor", img: luffy, bio: "Bob specializes in reformer Pilates." },
        {  name: "Bob", role: "Pilates Instructor", img: luffy, bio: "Bob specializes in reformer Pilates." },
        {  name: "Bob", role: "Pilates Instructor", img: luffy, bio: "Bob specializes in reformer Pilates." },
    ]

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="z-30 grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-15 px-8 lg:px-50 pt-8 pb-8">
            {team.map((member, index) => (
                <div
                    key={index}
                    className="opacity-0 animate-text-intro fill-both"
                    style={{ animationDelay: `${index * 0.2}s` }}
                >
                    <Card
                        name={member.name}
                        role={member.role}
                        img={member.img}
                        bio={member.bio}
                        isHidden={openIndex !== null}
                        onOpen={() => setOpenIndex(index)}
                        onClose={() => setOpenIndex(null)}
                    />
                </div>
            ))}
        </div>
    )
}
