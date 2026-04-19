import { useState } from 'react'
import Card from "../components/Card"
import type { People } from '../types/people'
import { useFetch } from '../utils/useFetch';

export default function People() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const { data: team, error } = useFetch<People []>('/people');

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
