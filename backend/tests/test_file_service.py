from pathlib import Path
import pytest
from app.services.file_service import FileService


def test_file_tree_generation_and_crud(tmp_path: Path):
    project_root = tmp_path / "test-proj"
    project_root.mkdir()

    # Create dummy files and folders
    (project_root / "src").mkdir()
    (project_root / "src" / "index.ts").write_text("console.log('hi');\n", encoding="utf-8")
    (project_root / "README.md").write_text("# Test\n", encoding="utf-8")

    service = FileService()
    tree = service.build_file_tree(project_root)
    assert len(tree) == 2  # README.md and src/

    # Test reading content
    content = service.read_file_content(project_root, "README.md")
    assert content == "# Test\n"

    # Test writing content
    service.write_file_content(project_root, "README.md", "# Updated\n")
    assert service.read_file_content(project_root, "README.md") == "# Updated\n"

    # Test creating a new file
    service.create_node(project_root, "src/utils.ts", is_directory=False)
    assert (project_root / "src" / "utils.ts").is_file()

    # Test deleting a file
    service.delete_node(project_root, "src/utils.ts")
    assert not (project_root / "src" / "utils.ts").exists()


def test_path_traversal_security(tmp_path: Path):
    project_root = tmp_path / "safe-proj"
    project_root.mkdir()
    service = FileService()

    with pytest.raises(ValueError, match="Access denied"):
        service.read_file_content(project_root, "../../etc/passwd")
