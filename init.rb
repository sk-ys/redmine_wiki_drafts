require_dependency File.expand_path('../lib/wiki_drafts/hooks.rb', __FILE__)


Redmine::Plugin.register :redmine_wiki_drafts do
  name 'Redmine Wiki Drafts Plugin'
  author 'sk-ys'
  description 'This is a Redmine plugin that automatically saves the content being edited in the Wiki as a draft'
  version '0.0.2'
  url 'https://github.com/sk-ys/redmine_wiki_drafts'
  author_url 'https://github.com/sk-ys'
  settings default: { max_stored_slots: 5, auto_save_interval_seconds: 60 },
           partial: 'settings/wiki_drafts'
end
