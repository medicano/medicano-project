import sys
from pydantic import BaseModel
from crewai.flow import Flow, listen, start
from medicano_crew.crews.content_crew.content_crew import DevCrew


class DevFlowState(BaseModel):
    request: str = ""
    result: str = ""


class MedicanoDevFlow(Flow[DevFlowState]):

    @start()
    def receive_request(self):
        if len(sys.argv) > 1:
            self.state.request = " ".join(sys.argv[1:])
        else:
            self.state.request = input("\nWhat do you want to implement?\n> ")

        print(f"\n🚀 Starting development: {self.state.request}\n")

    @listen(receive_request)
    def develop(self):
        result = DevCrew().crew().kickoff(
            inputs={"request": self.state.request}
        )
        self.state.result = str(result)

    @listen(develop)
    def finish(self):
        print("\n✅ Development complete!")
        print("📄 Review saved to output/review.md")


def kickoff():
    MedicanoDevFlow().kickoff()


def run():
    kickoff()


def plot():
    MedicanoDevFlow().plot()


def run_with_trigger():
    kickoff()


if __name__ == "__main__":
    kickoff()