# 生成可交付 HTML 工作台

当用户需要一份可打开的 GameLife 工作台时，使用：

```powershell
python skills\gamelife\scripts\render_workbench.py --output-dir <目标目录> --state <状态文件>
```

脚本会复制 HTML/CSS/JS，并生成一个只属于该工作台的 bootstrap 文件。若提供状态文件，首次打开时会把经过校验的状态写入浏览器的 `gamelife-skill:state:v1` 本地存储；用户之后在 HTML 中的修改仍由浏览器本地存储维护。

不要把包含真实任务、姓名、联系方式或其他私人内容的渲染目录提交到公开仓库。Skill 源码只保留示例状态和模板。

如果目标浏览器已经保存过同一工作台的本地状态，bootstrap 不会静默覆盖它；需要用户明确恢复示例或清理该浏览器站点数据后，才会重新使用传入的初始状态。
