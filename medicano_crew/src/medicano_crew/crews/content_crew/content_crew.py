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

    # ========================
    # AGENTS
    # ========================

    @agent
    def architect(self) -> Agent:
        return Agent(
            config=self.agents_config["architect"],  # type: ignore[index]
            verbose=True,
        )

    @agent
    def developer(self) -> Agent:
        return Agent(
            config=self.agents_config["developer"],  # type: ignore[index]
            verbose=True,
        )

    @agent
    def documenter(self) -> Agent:
        return Agent(
            config=self.agents_config["documenter"],  # type: ignore[index]
            verbose=True,
        )

    @agent
    def reviewer(self) -> Agent:
        return Agent(
            config=self.agents_config["reviewer"],  # type: ignore[index]
            verbose=True,
        )

    # ========================
    # TASKS
    # ========================

    @task
    def plan(self) -> Task:
        return Task(config=self.tasks_config["plan"])  # type: ignore[index]

    @task
    def implement(self) -> Task:
        return Task(config=self.tasks_config["implement"])  # type: ignore[index]

    @task
    def document(self) -> Task:
        return Task(config=self.tasks_config["document"])  # type: ignore[index]

    @task
    def review(self) -> Task:
        return Task(
            config=self.tasks_config["review"],  # type: ignore[index]
            output_file="output/review.md",
        )

    # ========================
    # CREW
    # ========================

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
