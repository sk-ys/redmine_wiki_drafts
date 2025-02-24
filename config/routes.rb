RedmineApp::Application.routes.draw do
  post   '/wiki_drafts',         to: 'wiki_drafts#save'   # auto save (defaults to slot 0)
  post   '/wiki_drafts/:slot',   to: 'wiki_drafts#save'   # manual save (slot 1-10) or explicit auto save (slot 0)
  get    '/wiki_drafts',         to: 'wiki_drafts#index'
  get    '/wiki_drafts/:slot',   to: 'wiki_drafts#show'
  delete '/wiki_drafts/:slot',   to: 'wiki_drafts#destroy'
end
