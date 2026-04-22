from typing import List
from crewai import Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task


@CrewBase
class DevCrew:
    """Medicano development crew."""

    agents: List[BaseAgent]
    tasks: List[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def architect(self) -> Agent:
        return Agent(
            config=self.agents_config["architect"],
            verbose=True,
        )

    @agent
    def developer(self) -> Agent:
        return Agent(
            config=self.agents_config["developer"],
            verbose=True,
        )

    @agent
    def documenter(self) -> Agent:
        return Agent(
            config=self.agents_config["documenter"],
            verbose=True,
        )

    @agent
    def reviewer(self) -> Agent:
        return Agent(
            config=self.agents_config["reviewer"],
            verbose=True,
        )

    @task
    def plan(self) -> Task:
        return Task(config=self.tasks_config["plan"])

    @task
    def implement(self) -> Task:
        return Task(config=self.tasks_config["implement"])

    @task
    def document(self) -> Task:
        return Task(config=self.tasks_config["document"])

    @task
    def review(self) -> Task:
        return Task(
            config=self.tasks_config["review"],
            output_file="output/review.md",
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )