import Card from "../components/Card"
import luffy from "../assets/luffy.jpg"

export default function People() {
    return (
        <div className="z-30 grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-15 px-8 md:px-50 pt-8 pb-8">
            <Card img={luffy} name="Ivy Chen" role="Founder & Pilates Instructor" />
            <Card img={luffy} name="Jane Doe" role="Instructor" />
            <Card img={luffy} name="Jane Doe" role="Instructor" />
            <Card img={luffy} name="Jane Doe" role="Instructor" />
        </div>
    )
}