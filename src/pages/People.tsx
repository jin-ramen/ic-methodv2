import Card from "../components/Card"
import luffy from "../assets/luffy.jpg"

export default function People() {
    return (
        <div className="">
            <Card img={luffy} name="Jane Doe" role="Instructor" />
            <Card img={luffy} name="Jane Doe" role="Instructor" />
        </div>
    )
}