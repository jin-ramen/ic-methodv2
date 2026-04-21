import { useState } from 'react'
import ProfileCard from "../components/ProfileCard"
import type { PeopleType } from '../types/people'

type PeopleProps = {
  data: PeopleType[] | null
  error: string | null
}

export default function People({ data: team, error }: PeopleProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (error) {
        return (
            <div className="px-8 lg:px-50 text-red-600">
                Couldn't load the team: {error}
            </div>
        );
    }

    if (!team) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-15 px-8 lg:px-50">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-xl bg-gray-200 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="z-30 grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-15 px-8 lg:px-50">
            {team.map((member, index) => (
                <div
                    key={index}
                    className="opacity-0 animate-text-intro fill-both"
                    style={{ animationDelay: `${index * 0.2}s` }}
                >
                    <ProfileCard
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
